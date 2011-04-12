class PasswordResetsController < ApplicationController
  
  ssl_required :new, :create, :update
  before_filter :require_no_user
  before_filter :load_user_using_perishable_token, :only => [:edit, :update]
  
  def new
    respond_to do |format|
      format.html
      format.js { render :layout => false }
    end
  end

  def create
    @user = User.find_by_email params[:email]
    
    if @user
      @user.delay.deliver_password_reset_instructions!
      msg = 'We\'ve sent you an email with instructions to reset your password. Please allow a few minutes for the email to arrive.'
      
      respond_to do |format|
        format.html do
          flash[:notice] = msg
          redirect_to login_path
        end
        
        format.js do
          render :text => "<div class='flash notice'><p>#{msg}</p></div>"
        end
      end
    else
      msg = 'Sorry, no user was found with that email address.'
      
      respond_to do |format|
        format.html do
          flash[:notice] = msg
          render :action => :new
        end
        
        format.js do
          flash.now[:notice] = msg
          render :action => :new, :layout => false
        end
      end
    end
  end

  def edit
  end

  def update
    @user.password = params[:user][:password]
    @user.password_confirmation = params[:user][:password_confirmation]
    @user_session = UserSession.new params[:user].merge(:email => @user.email)
    
    if @user.save && @user_session.save
      flash[:notice] = "Password successfully updated."
      redirect_to(@user.is_a?(Client) ? client_account_path : user_path(@user))
    else
      flash[:error] = model_errors @user, @user_session
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
