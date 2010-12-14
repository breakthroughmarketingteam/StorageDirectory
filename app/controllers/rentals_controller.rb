class RentalsController < ApplicationController
  
  ssl_required :new
  
  def new
    @search = Search.find_by_id session[:search_id]
    @listing = Listing.find params[:listing_id]
    @size = @listing.sizes.find params[:size_id]
    
    render :layout => 'bare'
  end

end
