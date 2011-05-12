class HelpsController < ApplicationController
  
  ssl_required :new, :create, :edit, :update, :destroy
  before_filter :get_models_paginated, :only => :index
  before_filter :get_model, :only => [:new, :edit, :update, :destroy]
  
  def index
    @page = Page.find_by_title 'Help'
    
    respond_to do |format|
      format.html {}
      format.js { render :layout => false }
    end
  end

  def show
    get_help
    
    respond_to do |format|
      format.html {}
      format.js do
        render :layout => false
      end
    end
  end

  def new
    render :layout => false if request.xhr?
  end

  def create
    @help = Help.new params[:help]

    respond_to do |format|
      format.html do
        if @help.save
          flash[:notice] = @help.title + ' has been created.'
          redirect_to helps_path
        else
          render :action => 'edit'
        end    
      end
      
      format.js do 
        if @help.save          
          get_models_paginated
          render :action => 'index', :layout => false
        else
          flash.now[:error] = model_errors @help
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
        if @help.update_attributes params[:help]
          flash[:notice] = @help.title + ' has been updated.'
          redirect_to :action => 'show'
        else
          render :action => 'edit'
        end
      end
      
      format.js do
        if @help.update_attributes params[:help]
          flash.now[:notice] = @help.title + ' has been updated.'
          get_models_paginated
          render :action => 'index', :layout => false
        else
          flash.now[:error] = model_errors @help
          render :action => 'edit', :layout => false
        end
      end
    end
  end

  def destroy
    if @help.destroy
      flash[:notice] = @help.title + ' DESTROYED!'
      redirect_to helps_path
    else
      flash[:error] = 'Error destroying ' + @help.title
      render :action => 'edit'
    end
  end
  
  def rate
    @help = Help.find params[:id]
    render :json => { :success => @help.rate(params[:stars], current_user, params[:dimension]) }
  end
  
  private
  
  def get_help # no pun intended
    @help = Help.find_available params[:title]
  end
  
end
