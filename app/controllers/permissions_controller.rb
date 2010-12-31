class PermissionsController < ApplicationController
  
  ssl_required :index, :show, :new, :create, :edit, :update, :destroy
  before_filter :get_models_paginated, :only => [:index, :show, :new, :edit]
  before_filter :get_model, :only => [:show, :edit, :update, :destroy]
  before_filter :get_roles, :only => [:new, :edit]
  
  def index
    render :layout => false if request.xhr?
  end

  def show
    render :layout => false if request.xhr?
  end

  def new
    @permission = Permission.new
    render :layout => false if request.xhr?
  end

  def create
    results = Permission.create_or_update_many(params[:permissions])
    @permissions = results[:permissions]
    
    respond_to do |format|
      format.html do
        if @permissions
          flash[:notice] = "#{@permissions.size} #{@permissions.size > 1 ? 'permissions have' : 'permission has'} been processed.<br />" +
                           "#{results[:updated]} updated, and #{results[:created]} created."
          redirect_back_or_default permissions_path
        else
          render :action => 'edit'
        end
      end
      
      format.js do
        if @permissions
          flash.now[:notice] = "#{@permissions.size} #{@permissions.size > 1 ? 'permissions have' : 'permission has'} been processed.<br />" +
                               "#{results[:updated]} updated, and #{results[:created]} created."
          get_models_paginated
          render :action => 'index', :layout => false
        else
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
        if @permission.update_attributes(params[:permission])
          flash[:notice] = @permission.title + ' has been updated.'
          redirect_back_or_default :action => 'show'
        else
          render :action => 'edit'
        end
      end
      
      format.js do
        if @permission.update_attributes(params[:permission])
          flash.now[:notice] = @permission.title + ' has been updated.'
          get_models_paginated
          render :action => 'index', :layout => false
        else
          render :action => 'edit', :layout => false
        end
      end
    end
  end

  def destroy
    if @permission.destroy
      flash[:notice] = @permission.title + ' DESTROYED!'
      redirect_back_or_default permissions_path
    else
      flash[:error] = 'Error destroying ' + @permission.title
      render :action => 'edit'
    end
  end
  
  private
  
  def get_roles
    @roles = Role.all :conditions => ['LOWER(title) != ?', 'admin']
  end

end
