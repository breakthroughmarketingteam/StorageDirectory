class UserSessionsController < ApplicationController
  
  skip_before_filter :authorize_user
  before_filter :require_no_user, :only => :new
  before_filter :require_user, :only => :destroy
  
  def new
    @user_session = UserSession.new
  end
  
  def create
    @user_session = UserSession.new(params[:user_session])
    
    if @user_session.save
      case current_user.role.title
      when 'advertiser'
        redirect_to client_account_path
      when 'admin'
        flash[:notice] = current_user.last_login_at ? "Welcome! Last login: #{current_user.last_login_at.asctime} " : "Welcome!"
        redirect_to clients_path
      else
        redirect_back_or_default user_path(current_user)
      end
      
    else
      render :action => :new
    end
  end
  
  def destroy
    current_user_session.destroy
    session.clear
    redirect_to root_path
  end

end
