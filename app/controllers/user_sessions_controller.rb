class UserSessionsController < ApplicationController
  
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
    @user_session = UserSession.new params[:user_session]
    
    if @user_session.save
      respond_to do |format|
        format.html do
          flash[:notice] = current_user.last_login_at ? "Welcome! Last login: #{current_user.last_login_at.asctime} " : "Welcome!"
          
          case current_user.role.title.downcase when 'admin'
            redirect_back_or_default admin_index_path
          when 'advertiser'
            redirect_to client_account_url :protocol => 'https'
          else
            redirect_back_or_default root_path
          end
        end
        
        format.js do
          render :json => { :success => true, :data => render_to_string(:partial => 'menus/topnav'), :role => @user_session.user.role.title, :account_path => client_account_path }
        end
      end
    else
      respond_to do |format|
        format.html do
          flash[:error] = model_errors(@user_session)
          render :action => :new
        end
        
        format.js do
          flash.now[:error] = model_errors(@user_session)
          render :json => { :success => false, :data => render_to_string(:action => :new, :layout => false) }
        end
      end
    end
  end
  
  def destroy
    current_user_session.destroy if current_user_session
    session.clear
    redirect_to root_path
  end

end
