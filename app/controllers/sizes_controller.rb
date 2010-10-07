class SizesController < ApplicationController
  
  before_filter :get_models_paginated, :only => :index
  before_filter :get_listing, :only => [:update, :create]
  before_filter :convert_price_to_cents, :only => [:update, :create]
  
  def index
  end

  def show
  end

  def new
  end

  def edit
  end
  
  def update
    @size = @listing.sizes.find(params[:id])
    
      if @size.update_attributes(params[:size])
        render :json => { :success => true }
      else
        render :json => { :success => false, :data => model_errors(@size) }
      end
  end
  
  def create
    @size = @listing.sizes.build(params[:size])
    
      if @size.save
        render :json => { :success => true }
      else
        render :json => { :success => false, :data => model_errors(@size) }
      end
  end
  
  private
  
  # TODO: scope the listings by user => current_user.listings.find, must set up client accounts that have listings to test with
  def get_listing
    @listing = Listing.find(params[:listing_id])
  end
  
  def convert_price_to_cents
    params[:size][:price] = params[:size][:price].to_i * 100
  end

end
