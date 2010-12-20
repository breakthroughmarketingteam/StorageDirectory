class HelptextsController < ApplicationController
  
  before_filter :get_models_paginated, :only => :index
  before_filter :get_model, :only => [:show, :new, :edit, :update, :destroy]
  
  def index
    render :layout => false if request.xhr?
  end
  
  def show
    render :layout => false if request.xhr?
  end
  
  def new
    render :layout => false if request.xhr?
  end

  def create
    @helptext = Helptext.new params[:helptext]
    
    respond_to do |format|
      format.html do
        if @helptext.save
          flash[:notice] = @helptext.title + ' has been created.'
          redirect_back_or_default(helptexts_path)
        else
          render :action => 'edit'
        end
      end
      
      format.js do
        if @helptext.save
          flash.now[:notice] = @helptext.title + ' has been created.'
          get_models
          render :action => 'index', :layout => false
        else
          flash.now[:error] = model_errors(@helptext)
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
        if @helptext.update_attributes(params[:helptext])
          flash[:notice] = @helptext.title + ' has been updated.'
          redirect_back_or_default(helptexts_path)
        else
          render :action => 'edit'
        end
      end
      
      format.js do
        if @helptext.update_attributes(params[:helptext])
          flash.now[:notice] = @helptext.title + ' has been updated.'
          get_models
          render :action => 'index', :layout => false
        else
          flash.now[:error] = model_errors(@helptext)
          render :action => 'edit', :layout => false
        end
      end
    end
  end

  def destroy
    respond_to do |format|
      format.html do
        if @helptext.destroy
          @helptext.helptext.destroy
          flash[:notice] = @helptext.title + ' DESTROYED!'
        else
          flash[:error] = 'Error destroying ' + @helptext.title
        end

        redirect_to helptexts_path
      end
      
      format.js do
        if @helptext.destroy
          @helptext.helptext.destroy
          flash.now[:notice] = @helptext.title + ' DESTROYED!'
          get_models
          render :action => 'index', :layout => false
        else
          flash.now[:error] = 'Error destroying ' + @helptext.title
          render :action => 'edit', :layout => false
        end
      end
    end
  end
  
end
