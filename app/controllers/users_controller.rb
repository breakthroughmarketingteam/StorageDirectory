class UsersController < ApplicationController
  
  ssl_required :index, :show, :new, :create, :edit, :update, :destroy
  before_filter :get_model, :only => [:show, :new, :edit, :update, :destroy]
  before_filter :get_roles, :only => [:index, :new, :edit, :create]
  before_filter :get_default_role, :only => :new
  
  def index
    @users = User.all :conditions => { :type => 'User' }
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
          @users = User.all :conditions => { :type => 'User' }
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
    if @user.update_attributes(params)
      flash[:notice] = "#{@user.name.possessive} account has been updated!"
      redirect_back_or_default user_path(@user)
    else
      render :action => :edit
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
  
  private
  
  def get_roles
    @roles = is_admin? ? Role.all : Role.non_admin_roles
  end
  
end
