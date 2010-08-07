class PicturesController < ApplicationController
  before_filter :get_models, :only => :index
  before_filter :get_model, :only => [:show, :edit, :update, :destroy]
  
  def index
  end

  def show
  end

  def new
    @picture = Picture.new
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
    raise @picture.pretty_inspect
    if @picture.save
      
    else
      
    end
  end

  def destroy
    if @picture.destroy
      flash[:notice] = 'Picture DESTROYED!'
      redirect_to root_path
    else
      flash[:error] = 'Error destroying Picture'
      render :action => 'edit'
    end
  end

end
