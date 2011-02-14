class PagesController < ApplicationController
  
  ssl_required :index, :new, :create, :edit, :update, :destroy
  before_filter :get_model_by_title_or_id, :only => :show
  before_filter :get_model, :only => [:new, :edit, :update, :destroy]
  before_filter :get_or_create_search, :only => :show
  before_filter :get_blocks, :only => [:new, :edit]
  before_filter :clear_empty_blocks_fields, :only => [:create, :update]
  before_filter :catch_nil_page, :only => :show
  before_filter :scrub_blocks_model_attributes_params, :only => [:create, :update]
  geocode_ip_address :only => :show
  
  def index
    @pages = Page.all_for_index_view
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
          render :action => 'edit'
        end
      end
      
      format.js do
        if @page.save
          flash.now[:notice] = @page.title + ' has been created.'
          @pages = Page.all_for_index_view
          render :action => 'index', :layout => false
        else
          flash.now[:error] = model_errors @page
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
        if @page.update_attributes params[:page]
          flash[:notice] = @page.title + ' has been updated.'
          redirect_to "/#{@page.title.parameterize}"
        else
          render :action => 'edit'
        end
      end
      
      format.js do
        if @page.update_attributes params[:page]
          flash.now[:notice] = @page.title + ' has been updated.'
          @pages = Page.all_for_index_view
          render :action => 'index', :layout => false
        else
          flash.now[:error] = model_errors @page
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
  
  def catch_nil_page
    if @page.nil?
      flash[:warning] = 'Page not found'
      redirect_to '/' and return
    end
  end
end
