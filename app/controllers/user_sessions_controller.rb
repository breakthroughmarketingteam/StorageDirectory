class UserSessionsController < ApplicationController
  
  before_filter :ensure_secure_subdomain, :only => :new
  ssl_required :new
  ssl_allowed :create, :destroy
  before_filter :require_no_user, :only => :new
  skip_before_filter :simple_auth
  
  def new
    @user_session = UserSession.new
    
    respond_to do |format|
      format.html {}
      format.js { render :layout => false }
    end
  end
  
  def create
    @user_session = UserSession.create params[:user_session]
    
    if @user_session.valid? && current_user.status
      @client_link = client_account_url(:protocol => 'https', :host => (RAILS_ENV == 'development' ? 'localhost' : "secure.#{$root_domain}"))
      
      respond_to do |format|
        format.html do
          flash[:notice] = current_user.last_login_at ? "Welcome! Last login: #{current_user.last_login_at.asctime} " : "Hi #{@user_session.user.first_name}"

          case current_user.role.title.downcase when 'admin', 'staff'
            redirect_back_or_default admin_index_path
          when 'advertiser'
            redirect_to @client_link
          else
            redirect_back_or_default root_path
          end
        end

        format.js do
          render :json => { :success => true, :data => render_to_string(:partial => 'menus/topnav'), :role => @user_session.user.role.title, :account_path => @client_link }
        end
      end
    else
      if !@user_session.valid?
        redir = { :action => :new }
        fmsg = flash.now[:error] = model_errors(@user_session)
        msg = render_to_string(:action => :new, :layout => false)
        
      elsif current_user.status == 'unverified'
        msg = fmsg ="You have not verified your account yet, did you click on the link in the email?"
        redir = login_path
      
      elsif current_user.status == 'suspended'
        msg = fmsg = "Your account seems to be suspended..."
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
    current_user_session.destroy if current_user_session
    session.clear
    
    cookies.to_hash.each_pair do |k, v| 
      cookies[k.to_sym] = { :value => '', :path => '/', :domain => ".#{$root_domain}", :expire => 1.day.ago } 
    end 
    
    redirect_to root_path
  end

end
