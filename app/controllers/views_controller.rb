class ViewsController < ApplicationController
  
  ssl_required :index, :show, :new, :create, :edit, :update, :destroy
  before_filter :get_model, :only => [:show, :new, :edit, :update, :destroy]
  
  def index
    @views = View.all_for_index_view
    render :layout => false if request.xhr?
  end

  def show
    render :layout => false if request.xhr?
  end

  def new
    render :layout => false if request.xhr?
  end

  def create
    @view = View.new params[:view]
    
    respond_to do |format|
      format.html do
        if @view.save
          flash[:notice] = @view.name + ' has been created.'
          redirect_back_or_default views_path
        else
          render :action => 'edit'
        end
      end
      
      format.js do
        if @view.save
          flash.now[:notice] = @view.name + ' has been created.'
          get_models_paginated
          render :layout => false, :action => 'index'
        else
          flash.now[:error] = model_errors @view
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
        if @view.update_attributes params[:view]
          flash[:notice] = @view.name + ' has been updated.'
          redirect_back_or_default views_path
        else
          render :action => 'edit'
        end
      end
      
      format.js do
        if @view.update_attributes params[:view]
          flash.now[:notice] = @view.name + ' has been updated.'
          get_models_paginated
          render :layout => false, :action => 'index'
        else
          flash.now[:error] = model_errors @view
          render :action => 'edit', :layout => false
        end
      end
    end
  end

  def destroy
    respond_to do |format|
      format.html do
        if @view.destroy
          flash[:notice] = @view.name + ' DESTROYED!'
          redirect_back_or_default views_path
        else
          flash[:error] = 'Error destroying ' + @view.name
          render :action => 'edit'
        end
      end
      
      format.js do
        if @view.destroy
          flash.now[:notice] = @view.name + ' has been DESTROYED!'
        else
          flash.now[:error] = 'Could not destroy that view.'
        end
        
        get_models_paginated
        render :action => 'index', :layout => false
      end
    end
  end
  
end