class ImagesController < ApplicationController
  
  ssl_required :new, :create, :edit, :update, :destroy
  ssl_allowed :index, :show
  before_filter :get_images, :only => :index
  before_filter :get_user, :only => :index
  before_filter :get_model, :only => [:show, :edit, :update, :destroy]
  
  def index
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
    @image.image_file_name ||= params[:url_to_image] unless params[:url_to_image].match(/(somedomain\.com)/i)

    respond_to do |format|
      format.html do 
        if @image.save
          @image.add_to_gallery(params) unless params[:gallery_id].nil?
          flash[:notice] = @image.title + ' has been created.'
        else
          flash[:error] = model_errors @image
        end

        redirect_back_or_default images_path
      end
      
      format.js do
        if @image.save
          @image.add_to_gallery(params) unless params[:gallery_id].nil?
          flash.now[:notice] = @image.title + ' has been created.'
          get_images
          render :action => 'index', :layout => false
        else
          flash.now[:error] = model_errors @image
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
          flash[:error] = model_errors @image
        end

        redirect_back_or_default images_path
      end
      
      format.js do
        if @image.update_attributes(params[:image])
          flash.now[:notice] = @image.title + ' has been updated.'
          get_images
          render :action => 'index', :layout => false
        else
          flash.now[:error] = model_errors @image
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
          @image.image.destroy
          flash.now[:notice] = @image.title + ' has been DESTROYED!'
          get_images
          render :action => 'index', :layout => false
        else
          flash.now[:error] = "Couldn't DESTROY Image: #{@image.title}"
          render :action => 'edit', :layout => false
        end
      end
    end
  end
  
  private
  
  def get_user
    @user = User.find_by_id params[:user_id] if params[:user_id]
  end
  
  def get_images
    @images = @user.nil? ? get_models_paginated : @user.images
  end
  
end
