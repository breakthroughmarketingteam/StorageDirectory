class MapsController < ApplicationController
  
  # TODO: scope listings by current user when they are not an admin
  def update
    @listing = Listing.find(params[:listing_id])
    @map = @listing.map
    
    return false if @map.id != params[:id].to_i
    
    tag_list = params[:map].delete(:tag_list)
    @listing.tag_list = tag_list
    
    map_saved = @map.update_attributes params[:map]
    render :json => { :success => (map_saved && @listing.save), :data => model_errors(@listing, @map) }
  end
  
end
