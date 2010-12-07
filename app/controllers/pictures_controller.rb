class PicturesController < ApplicationController
  before_filter :get_models, :only => :index
  before_filter :get_model, :only => [:show, :edit, :update]
  
  def index
    render :layout => false if request.xhr?
  end

  def show
    render :layout => false if request.xhr?
  end

  def new
    @picture = Picture.new
    render :layout => false if request.xhr?
  end

  def create
    @picture = Picture.new(params[:picture])
    
    if @picture.save
      flash[:notice] = 'Pciture has been created.'
      redirect_to root_path
    else
      get_associations
      render :action => 'edit'
    end    
  end

  def edit
    render :layout => false if request.xhr?
  end

  def update
    if @picture.update_attributes(params[:picture])
      flash[:notice] = 'Picture has been updated.'
      redirect_to :action => 'show'
    else
      get_associations
      render :action => 'edit'
    end
  end
  
  def create
    @listing = Listing.find(params[:picture][:listing_id])
    @picture = @listing.pictures.build params[:picture]
    
    respond_to do |format|
      format.html
      format.js do
        if @picture.save
          render :json => { :success => true, :data => { :thumb => @picture.facility_image.url(:thumb), :image => @picture.facility_image.url(:medium), :id => @picture.id, :listing_id => @listing.id } }
        else
          render :json => { :success => false, :data => model_errors(@picture) }
        end
      end
    end
  end

  def destroy
    return if current_user.nil?
    
    @listing = (is_admin? ? @listing.client : current_user).listings.find(params[:listing_id])
    @picture = @listing.pictures.find(params[:id])
    
    respond_to do |format|
      format.html do
        if @picture.destroy
          flash[:notice] = 'Picture DESTROYED!'
          redirect_to root_path
        else
          flash[:error] = 'Error destroying Picture'
          render :action => 'edit'
        end
      end
      
      format.js do
        @picture.destroy
        @picture.facility_image = nil
        render :json => { :success => true }
      end
    end
  end

end
