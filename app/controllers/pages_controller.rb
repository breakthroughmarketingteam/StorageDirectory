class PagesController < ApplicationController
  
  before_filter :get_models_paginated, :only => :index
  before_filter :get_page, :only => :show
  before_filter :get_model, :only => [:new, :edit, :update, :destroy]
  before_filter :get_or_create_search, :only => :show
  before_filter :get_blocks, :only => [:new, :edit]
  before_filter :clear_empty_blocks_fields, :only => [:create, :update]
  
  geocode_ip_address :only => :show
  
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
    @page = Page.new params[:page]
    
    respond_to do |format|
      format.html do
        if @page.save
          flash[:notice] = @page.title + ' has been created.'
          redirect_to root_path
        else
          get_associations
          render :action => 'edit'
        end
      end
      
      format.js do
        if @page.save
          flash.now[:notice] = @page.title + ' has been created.'
          @pages = Page.all_for_index_view
          render :action => 'index', :layout => false
        else
          flash.now[:error] = model_errors(@page)
          get_associations
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
        if @page.update_attributes(params[:page])
          flash[:notice] = @page.title + ' has been updated.'
          redirect_to "/#{@page.title.parameterize}"
        else
          get_associations
          render :action => 'edit'
        end
      end
      
      format.js do
        if @page.update_attributes(params[:page])
          flash.now[:notice] = @page.title + ' has been updated.'
          @pages = Page.all_for_index_view
          render :action => 'index', :layout => false
        else
          flash.now[:error] = model_errors(@page)
          get_associations
          render :action => 'edit', :layout => false
        end
      end
    end
  end

  def destroy
    if @page.destroy
      flash[:notice] = @page.title + ' DESTROYED!'
      redirect_to root_path
    else
      flash[:error] = 'Error destroying ' + @page.title
      render :action => 'edit'
    end
  end
  
  private
  
  def get_page
    # monkey patched parameterize method. see: /lib/utility_methods.rb:31
    @page = params[:title] ? Page.find_by_title_in_params(params[:title]) : Page.find_by_id(params[:id])
    
    if @page.nil?
      #flash[:warning] = "Page Not Found"
      @page = Page.find_by_title 'Home'
    end
  end

end
