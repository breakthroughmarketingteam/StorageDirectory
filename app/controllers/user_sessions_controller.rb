class UserSessionsController < ApplicationController
  
  ssl_required :new
  ssl_allowed :create, :destroy
  before_filter :require_no_user, :only => :new
  skip_before_filter :simple_auth
  
  def new
    @user_session = UserSession.new
    
    if params[:auth_token]
      @user = User.find_by_perishable_token params[:auth_token]
      flash[:quick_login] = [@user.email, @user.temp_password] if @user
    end
    
    respond_to do |format|
      format.html {}
      format.js { render :layout => false }
    end
  end
  
  def create
    @user_session = UserSession.create params[:user_session]
    
    if @user_session.valid? && (current_user && current_user.status == 'active')
      @client_link = client_account_url(:protocol => 'https', :host => (RAILS_ENV == 'development' ? 'localhost' : $root_domain))
      
      respond_to do |format|
        format.html do
          case current_user.role.title.downcase when 'admin', 'staff'
            flash[:notice] = current_user.last_login_at ? "Welcome! Last login: #{current_user.last_login_at.asctime} " : nil
            redirect_back_or_default admin_index_path
          when 'advertiser'
            redirect_to @client_link
          when 'tenant'
            redirect_to tenant_url current_user, :protocol => 'https'
          else
            redirect_back_or_default root_path
          end
        end

        format.js do
          render :json => { 
            :success => true, 
            :data => { 
              :html  => render_to_string(:partial => 'menus/topnav'), 
              :name  => current_user.name,
              :email => current_user.email,
              :role  => current_user.role.title, 
              :account_path => @client_link
            }
          }
        end
      end
    else
      if !@user_session.valid?
        redir = { :action => :new }
        fmsg = flash.now[:error] = model_errors(@user_session)
        msg = render_to_string(:action => :new, :layout => false)
        
      elsif current_user.status == 'unverified'
        msg = fmsg = 'You have not verified your account yet, did you click on the link in the email?'
        redir = login_path
      
      elsif current_user.status == 'suspended'
        msg = fmsg = 'Your account seems to be suspended...'
        redir = login_path
      else
        msg = fmsg = 'Your account seems to be inactive. Contact support if you think there\'s a problem.'
        redir = login_path
      end
      
      respond_to do |format|
        format.html do
          flash[:error] = fmsg
          redirect_to redir
        end

        format.js do
          render :json => { :success => false, :data => msg }
        end
      end
    end
  end
  
  def destroy
    role = current_user.role.title.downcase rescue nil
    current_user_session.destroy if current_user_session
    session.clear
    
    cookies.to_hash.each_pair do |k, v| 
      cookies[k.to_sym] = { :value => '', :path => '/', :domain => ".#{$root_domain}", :expire => 1.day.ago } 
    end 
    
    case role when 'admin', 'staff', 'advertiser'
      redirect_to login_url, :protocol => 'http'
    else
      redirect_to root_url, :protocol => 'http'
    end
  end

end
