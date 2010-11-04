class ImagesController < ApplicationController
  
  before_filter :get_image, :only => [:show, :edit, :update, :destroy]
  
  def index
    if params[:user_id].blank?
      get_images
    else
      @images = User.find(params[:user_id]).images
    end
    
    render :layout => false if request.xhr?
  end
  
  def show
    render :layout => false if request.xhr?
  end
  
  def new
    @image = Image.new
    render :layout => false if request.xhr?
  end

  def create
    @image = Image.new params[:image]

    respond_to do |format|
      format.html do 
        if @image.save
          @image.add_to_gallery(params) unless params[:gallery_id].nil?
          flash[:notice] = @image.title + ' has been created.'
        else
          flash[:error] = model_errors(@image)
        end

        redirect_back_or_default images_path
      end
      
      format.js do
        if @image.save
          @image.add_to_gallery(params) unless params[:gallery_id].nil?
          flash.now[:notice] = @image.title + ' has been created.'
          get_models
          render :action => 'index', :layout => false
        else
          flash.now[:error] = model_errors(@image)
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
        if @image.update_attributes(params[:image])
          flash[:notice] = @image.title + ' has been updated.'
        else
          flash[:error] = model_errors(@image)
        end

        redirect_back_or_default images_path
      end
      
      format.js do
        if @image.update_attributes(params[:image])
          flash.now[:notice] = @image.title + ' has been updated.'
          get_models
          render :action => 'index', :layout => false
        else
          flash.now[:error] = model_errors(@image)
          render :action => 'edit', :layout => false
        end
      end
    end
  end

  def destroy
    respond_to do |format|
      format.html do 
        if @image.destroy
          @image.image.destroy
          flash[:notice] = @image.title + ' DESTROYED!'
        else
          flash[:error] = 'Error destroying ' + @image.title
        end

        redirect_back_or_default images_path
      end
      
      format.js do
        if @image.destroy
          flash.now[:notice] = @image.title + ' has been DESTROYED!'
          get_models
          render :action => 'index', :layout => false
        else
          flash.now[:error] = "Couldn't DESTROY Image: #{@image.title}"
          render :action => 'edit', :layout => false
        end
      end
    end
  end

  private
  
  def get_images
    @images = Image.all
  end
  
  def get_image
    @image = Image.find(params[:id])
  end
  
end
