class UsersController < ApplicationController

  ssl_required :index, :show, :new, :create, :edit, :update, :destroy
  ssl_allowed :authenticate
  skip_before_filter :simple_auth, :only => :authenticate
  before_filter :get_model, :only => [:show, :new, :edit, :update, :destroy]
  before_filter :get_roles, :only => [:index, :new, :edit, :create]
  before_filter :get_default_role, :only => :new
  
  def index
    get_users
    render :layout => false if request.xhr?
  end
  
  def show
    render :layout => false if request.xhr?
  end
  
  def new
    render :layout => false if request.xhr?
  end
  
  def create
    @form = Form.find params[:fid] unless params[:fid].blank?
    @user = User.new params[:user]
    
    respond_to do |format|
      format.html do
        if @user.save
          flash[:notice] = 'Great! Thanks for signing up!'
          redirect_back_or_default user_path(@user)
        else
          render :action => :new
        end
      end
      
      format.js do
        if @user.save
          flash.now[:notice] = 'Great! Thanks for signing up!'
          get_users
          render :action => 'index', :layout => false
        else
          flash.now[:error] = model_errors @user
          render :action => 'edit', :layout => false
        end
      end
    end
  end

  def edit
    render :layout => false if request.xhr?
  end
  
  def update
    respond_to do |format|
      format.html do
        if @user.update_attributes(params)
          flash[:notice] = "#{@user.name.possessive} account has been updated!"
          redirect_back_or_default user_path(@user)
        else
          render :action => :edit
        end
      end
      
      format.js do
        if @user.update_attributes(params)
          flash.now[:notice] = "#{@user.name.possessive} account has been updated!"
          get_users
          render :action => 'index', :layout => false
        else
          flash.now[:error] = model_errors @user
          render :action => 'edit', :layout => false
        end
      end
    end
  end
  
  def destroy
    if @user.destroy
      flash[:notice] = @user.name + ' DESTROYED!'
      redirect_to users_path
    else
      flash[:error] = 'Error destroying ' + @user.name
      render :action => 'edit'
    end
  end
  
  def authenticate
    current_user.reload
    @authentic = UserSession.new params[:auth].merge(:email => current_user.email)
    render :json => { :success => @authentic.valid?, :data => model_errors(@authentic) }
  end
  
  private
  
  def get_users
    @users = User.all(:conditions => { :type => 'User' }).paginate :per_page => 15, :page => params[:page]
  end
  
  def get_roles
    @roles = is_admin? ? Role.all : Role.non_admin_roles
  end
  
end
