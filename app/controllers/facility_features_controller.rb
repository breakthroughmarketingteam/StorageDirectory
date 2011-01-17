class FacilityFeaturesController < ApplicationController
  
  ssl_required :index, :update
  before_filter :get_parent_models, :only => :update
  
  def index
    get_models_paginated
    render :layout => false if request.xhr?
  end
  
  def update
    @issn_feature = IssnUnitTypeFeature.find params[:id]
    raise [params, @issn_feature].pretty_inspect
    if params[:status] == 'true' # assign this feature to the list
      @listing.facility_features.create :standard_id => @issn_feature.id
    else
      @facility_feature = @listing.facility_features.find_by_standard_id @issn_feature.id
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
