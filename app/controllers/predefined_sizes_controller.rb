class PredefinedSizesController < ApplicationController
  
  before_filter :get_models_paginated, :only => [:index, :new, :edit]
  before_filter :get_model, :only => [:show, :new, :edit, :update, :destroy]
  
  def index
    render :layout => false if request.xhr?
  end

  def new
    render :layout => false if request.xhr?
  end
  
  def create
    @predefined_size = PredefinedSize.new params[:predefined_size]
    
    respond_to do |format|
      format.html do 
        if @predefined_size.save
          flash[:notice] = @predefined_size.title + ' has been created.'
          redirect_back_or_default :action => 'index'
        else
          render :action => 'edit'
        end
      end
      
      format.js do
        if @predefined_size.save
          flash.now[:notice] = @predefined_size.title + ' has been created.'
          get_models
          render :action => 'index', :layout => false
        else
          flash.now[:error] = model_errors(@predefined_size)
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
        if @predefined_size.update_attributes params[:predefined_size]
          flash[:notice] = @predefined_size.title + ' has been updated.'
          redirect_back_or_default :action => 'show'
        else
          render :action => 'edit'
        end
      end
      
      format.js do
        if @predefined_size.update_attributes params[:predefined_size]
          flash.now[:notice] = @predefined_size.title + ' has been updated.'
          get_models
          render :action => 'index', :layout => false
        else
          flash.now[:error] = model_errors(@predefined_size)
          render :action => 'edit', :layout => false
        end
      end
    end
  end

  def destroy
    respond_to do |format|
      format.html do 
        if @predefined_size.destroy
          flash[:notice] = @predefined_size.title + ' DESTROYED!'
          redirect_back_or_default predefined_sizes_path
        else
          flash[:error] = 'Error destroying ' + @predefined_size.title
          render :action => 'edit'
        end
      end
      
      format.js do
        if @predefined_size.destroy
          flash.now[:notice] = @predefined_size.title + ' DESTROYED!'
          get_models
          render :action => 'index', :layout => false
        else
          flash.now[:error] = 'Error destroying ' + @predefined_size.title
          render :action => 'edit', :layout => false
        end
      end
    end
  end
  
end
