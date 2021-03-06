class SizesController < ApplicationController
  
  ssl_required :update, :create, :destroy
  before_filter :get_models_paginated, :only => :index
  before_filter :get_model, :only => [:show, :new, :edit, :update, :destroy]
  before_filter :get_listing, :only => [:update, :create, :destroy]
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
    if @size.update_attributes params[:size]
      render :json => { :success => true, :data => render_to_string(:partial => 'sizes/size', :locals => { :size => @size, :pretend_action => 'edit' }) }
    else
      render :json => { :success => false, :data => model_errors(@size) }
    end
  end
  
  def create
    @size = @listing.sizes.build params[:size]
  
    if @size.save
      render :json => { :success => true, :data => render_to_string(:partial => 'sizes/size', :locals => { :size => @size, :pretend_action => 'edit' }) }
    else
      render :json => { :success => false, :data => model_errors(@size) }
    end
  end
  
  def destroy
    if @size.destroy
      render :json => { :success => true }
    else
      render :json => { :success => false, :data => 'Error destroying size' }
    end
  end
  
  private
  
  def get_listing
    @listing = (current_user && current_user.has_role?('admin', 'staff')) ? Listing.find(params[:listing_id]) : current_user.listings.find(params[:listing_id])
  end
  
  def convert_price_to_cents
    params[:size][:price] = params[:size][:price].to_f * 100.0
  end

end
