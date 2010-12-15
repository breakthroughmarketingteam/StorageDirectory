class SizeIconsController < ApplicationController
  before_filter :get_models, :only => [:index, :show, :new, :edit]
  before_filter :get_model, :only => [:show, :edit, :update, :destroy]
  before_filter :_get_icon_sizes, :only => [:new, :edit]
  
  def index
    render :layout => false if request.xhr?
  end

  def show
    render :layout => false if request.xhr?
  end

  def new
    @size_icon = SizeIcon.new
    render :layout => false if request.xhr?
  end
  
  def create
    @size_icon = SizeIcon.new params[:size_icon]
    
    respond_to do |format|
      format.html do 
        if @size_icon.save
          flash[:notice] = @size_icon.title + ' has been created.'
          redirect_back_or_default :action => 'index'
        else
          render :action => 'edit'
        end
      end
      
      format.js do
        if @size_icon.save
          flash.now[:notice] = @size_icon.title + ' has been created.'
          get_models
          render :action => 'index', :layout => false
        else
          flash.now[:error] = model_errors(@size_icon)
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
        if @size_icon.update_attributes params[:size_icon]
          flash[:notice] = @size_icon.title + ' has been updated.'
          redirect_back_or_default :action => 'show'
        else
          render :action => 'edit'
        end
      end
      
      format.js do
        if @size_icon.update_attributes params[:size_icon]
          flash.now[:notice] = @size_icon.title + ' has been updated.'
          get_models
          render :action => 'index', :layout => false
        else
          flash.now[:error] = model_errors(@size_icon)
          render :action => 'edit', :layout => false
        end
      end
    end
  end

  def destroy
    respond_to do |format|
      format.html do 
        if @size_icon.destroy
          flash[:notice] = @size_icon.title + ' DESTROYED!'
          redirect_back_or_default size_icons_path
        else
          flash[:error] = 'Error destroying ' + @size_icon.title
          render :action => 'edit'
        end
      end
      
      format.js do
        if @size_icon.destroy
          flash.now[:notice] = @size_icon.title + ' DESTROYED!'
          get_models
          render :action => 'index', :layout => false
        else
          flash.now[:error] = 'Error destroying ' + @size_icon.title
          render :action => 'edit', :layout => false
        end
      end
    end
  end
  
  private
  
  def _get_icon_sizes
    @icon_sizes = SizeIcon.icons_sizes
  end
end
