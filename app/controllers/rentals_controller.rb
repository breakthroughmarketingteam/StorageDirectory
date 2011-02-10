class RentalsController < ApplicationController
  
  ssl_required :index, :show, :new, :create, :edit, :update, :destroy
  before_filter :get_models_paginated, :only => :index
  before_filter :get_model, :only => [:show, :new, :edit, :update, :destroy]
  
  def index
    render :layout => false if request.xhr?
  end
  
  # this methods renders the secure form in an iframe
  def new
    @search = Search.find_by_id cookies[:sid].to_i
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
        if @rental.update_attributes params[:rental]
          flash.now[:notice] = "Successfully updated rental with id #{@rental.id}"
          get_models_paginated
          render :action => 'index', :layout => false
        else
          flash.now[:error] = "Could not update rental with id #{@rental.id}"
          render :action => 'edit', :layout => false
        end
      end
    end
  end
  
  def destroy
    respond_to do |format|
      format.html do 
        if @rental.destroy
          flash[:notice] = "#{@rental.title} has been DESTROYED!"
          redirect_to rentals_path
        else
          flash[:error] = "Could not destroy rental with id #{@rental.id}"
        end
      end
      
      format.js do
        if @rental.destroy
          flash.now[:error] = "#{@rental.title} has been DESTROYED!"
          get_models_paginated
          render :action => 'index', :layout => false
        else
          flash.now[:error] = "Could not destroy rental with id #{@rental.id}"
          render :action => 'edit', :layout => false
        end
      end
    end
  end

end
