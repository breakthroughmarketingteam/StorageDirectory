class SpecialsController < ApplicationController
  
  # TODO: scope listings by current user when not admin
  before_filter :get_listing
  
  def update
    @special = @listing.specials.find(params[:id])
    saved = @special.update_attribute :content, params[:listing][:special]
    
    render :json => { :success => saved, :data => model_errors(@listing, @special) }
  end
  
  def create
    @special = @listing.specials.build :content => params[:listing][:special]
    
    render :json => { :success => @listing.save, :data => model_errors(@listing, @special) }
  end
  
  private
  
  def get_listing
    @listing = Listing.find(params[:listing_id])
  end
  
end
