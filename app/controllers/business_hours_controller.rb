class BusinessHoursController < ApplicationController
  
  before_filter :get_listing
  
  def create
    @listing.update_attributes :office_24_hours => params[:office_24_hours], :access_24_hours => params[:access_24_hours]
    @listing.business_hours = []
    @hours = @listing.business_hours.create params[:business_hours]
    
    render :json => { :success => true }
    
  rescue => e
    render :json => { :success => false, :data => e.message }
  end
  
  def update
    raise params.pretty_inspect
  end
  
  private
  
  def get_listing
    @listing = Listing.find params[:listing_id]
  end
  
end
