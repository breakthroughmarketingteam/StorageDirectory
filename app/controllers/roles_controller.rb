class RolesController < ApplicationController
  before_filter :get_models, :only => [:index, :show, :new, :edit]
  before_filter :get_model, :only => [:show, :edit, :update, :destroy]
  
  def index
  end

  def show
  end

  def new
    @role = Role.new
  end
  
  # TODO: too much code in this controller, fix it!
  def create
    error = ''
    
    if params[:roles]
      params[:roles].each do |role|
        @role = Role.new(role) unless role[:title].blank?
        error << model_errors(@role) unless @role.save
      end
    else
      @role = Role.new(params[:roles])
      error << model_errors(@role) unless @role.save
    end
    
    respond_to do |format|
      format.html do
        if error.blank?
          flash[:notice] = "#{params[:roles].nil? ? 'Role has' : 'Roles have'} been created."
          redirect_back_or_default roles_path
        else
          flash[:error] = 'Oops, something went wrong.'
          @role.nil? ? render(:action => 'edit') : redirect_back_or_default(roles_path)
        end
      end
      
      format.js do
        if error.blank?
          flash.now[:notice] = "#{params[:roles].nil? ? 'Role has' : 'Roles have'} been created."
          get_models
          render :action => 'index', :layout => false
        else
          flash.now[:error] = 'Oops, something went wrong.'
          render :action => 'edit', :layout => false
        end
      end
    end
  end

  def edit
  end

  def update
    respond_to do |format|
      format.html do
        if @role.update_attributes(params[:role])
          flash[:notice] = @role.title + ' has been updated.'
          redirect_back_or_default :action => 'show'
        else
          render :action => 'edit'
        end
      end
      
      format.js do
        if @role.update_attributes(params[:role])
          flash.now[:notice] = @role.title + ' has been updated.'
          get_models
          render :action => 'index', :layout => false
        else
          flash.now[:error] = model_errors(@role.title)
          render :action => 'edit', :layout => false
        end
      end
    end
  end

  def destroy
    if @role.destroy
      flash[:notice] = @role.title + ' DESTROYED!'
      redirect_back_or_default roles_path
    else
      flash[:error] = 'Error destroying ' + @role.title
      render :action => 'edit'
    end
  end

end
