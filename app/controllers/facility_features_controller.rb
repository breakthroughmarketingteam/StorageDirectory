class FacilityFeaturesController < ApplicationController
  
  before_filter :get_parent_models
  
  def update
    @issn_facility_feature = IssnFacilityFeature.find_by_ShortDescription(params[:title].gsub('-', ' '))
    
    if params[:status] == 'true' # assign this feature to the list
      @listing.facility_features.create :standard_id => @issn_facility_feature.id
    else
      @facility_feature = @listing.facility_features.find_by_standard_id @issn_facility_feature.id
      @facility_feature.destroy if @facility_feature
    end
    
    render :json => { :success => true }
  rescue => e
    render :json => { :success => false, :data => e.message }
  end
  
  private
  
  def get_parent_models
    @client = Client.find params[:client_id]
    @listing = @client.listings.find params[:listing_id]
  end
  
end
