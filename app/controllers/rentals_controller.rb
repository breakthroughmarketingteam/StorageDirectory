class RentalsController < ApplicationController
  
  ssl_required :new
  before_filter :get_models_paginated, :only => :index
  before_filter :get_model, :only => [:edit, :update, :destroy]
  
  def index
    render :layout => false if request.xhr?
  end
  
  # this methods renders the secure form in an iframe
  def new
    @search = Search.find_by_id session[:search_id]
    @listing = Listing.find params[:listing_id]
    @size = @listing.sizes.find params[:size_id]
    
    render :layout => 'bare'
  end
  
  def edit
    render :layout => false if request.xhr?
  end
  
  def update
    respond_to do |format|
      format.html {}
      format.js do
        
      end
    end
  end
  
  def destroy
    
  end

end
