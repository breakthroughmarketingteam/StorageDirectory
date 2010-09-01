class PasswordResetsController < ApplicationController
  before_filter :require_no_user
  before_filter :load_user_using_perishable_token, :only => [:edit, :update]
  
  def new
  end

  def create
    @user = User.find_by_email(params[:email])
    
    if @user
      @user.deliver_password_reset_instructions!
      flash[:notice] = "Instructions to reset your password have been emailed to you. Please check your email."
      redirect_to login_path
    else
      flash[:notice] = 'Sorry, no user was found with that email address.'
      render :action => :new
    end
  end

  def edit
  end

  def update
    @user.password = params[:user][:password]
    @user.password_confirmation = params[:user][:password_confirmation]
    @user_session = UserSession.new(params[:user].merge(:email => @user.email))
    
    if @user.save && @user_session.save
      flash[:notice] = "Password successfully updated."
      redirect_to(@user.is_a?(Client) ? client_account_path : user_path(@user))
    else
      flash[:error] = model_errors(@user, @user_session)
      render :action => :edit
    end
  end

  private
  
  def load_user_using_perishable_token
    @user = User.find_by_perishable_token(params[:id])
    
    unless @user
      flash[:notice] = "We're sorry, but we could not locate your account. " +
      "If you are having issues try copying and pasting the URL " +
      "from your email into your browser or restarting the " +
      "reset password process."
      redirect_to login_path
    end
  end
  
end