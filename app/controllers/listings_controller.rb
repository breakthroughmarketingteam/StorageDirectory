class ListingsController < ApplicationController

  before_filter :get_models_paginated, :only => :index
  before_filter :get_model, :only => [:show, :edit]
  before_filter :get_client, :only => :edit
  before_filter :get_map, :only => [:show, :edit]
  before_filter :get_listing_relations, :only => [:show, :edit]
  
  def index
    data = Listing.get_facility_info 'getFacilityUnitTypes'
    render :text => data
  end
  
  def locator
    # we replaced a normal page model by a controller action, but we still need data from the model to describe this "page"
    @page = Page.find_by_title 'Self Storage'
    
    result = Listing.geo_search params, session
    @listings = result[:data]
    @location = result[:location]
    @maps_data = { :center => { :lat => @location.lat, :lng => @location.lng, :zoom => 12 }, :maps => @listings.collect(&:map_data) }
    
    get_map @location
    
    # updates the impressions only for listings on current page
    @listings.map { |m| m.update_stat 'impressions', request } unless current_user && current_user.has_role?('admin', 'advertiser')
    
    if session[:location].blank? || params[:q] && params[:state].blank?
      session[:location] = @location.to_hash
      #redirect_to storage_state_city_path(@location.state.parameterize, @location.city.parameterize) and return
    end
    
    respond_to do |format|
      format.html
      format.js do # implementing these ajax responses for the search results 'More Link'
        # include listing's related data
        @listings.map! do |m|
          mm = { :info => m.attributes, :map => m.map.attributes, :specials => m.specials, :sizes => m.sizes, :pictures => m.pictures }
          mm[:map].merge!(:distance => m.distance_from(@location))
          mm
        end
        
        render :json => { :success => !@listings.blank?, :data => @listings, :maps_data => @maps_data }
      end
    end
  end
  
  def compare
    if params[:ids] && params[:ids].match(/\d+/)
      session[:compare_listing_ids] = params[:ids].split(',').reject(&:blank?)
      redirect_to compare_listings_path(:ids => '')
    end
    
    @listings = Listing.find(session[:compare_listing_ids])
    @location = Geokit::Geocoders::MultiGeocoder.geocode(@listings.first.map.full_address)
    @maps_data = { :center => { :lat => @location.lat, :lng => @location.lng, :zoom => 10 }, :maps => @listings.collect(&:map_data) }
  end

  def show
    @listing.update_stat 'clicks', request unless current_user && current_user.has_role?('admin', 'advertiser')
  end

  def new
  end

  def edit
    # when a user creates a listing, a partial pops up and they fill in the address and click edit, sending data via GET
    # we intercept those those values here and save it to the map that was created when they clicked new and typed in a title (blur event on the title input)
    unless params[:map].blank?
      @listing.map.update_attributes params[:map]
      redirect_to(:action => 'edit') and return
    end
    
    
  end
  
  def update
    @listing = current_user.listings.find(params[:id])
    case params[:from]
    when 'quick_create'
      @map = @listing.map
      
      if @map.update_attributes params[:listing][:map_attributes]
        render :json => { :success => true, :data => render_to_string(:partial => 'listing', :locals => { :owned => true, :listing => @listing }) }
      else
        render :json => { :success => true, :data => model_errors(@map) }
      end
      
    else
      raise ['params[:from] is nil or unrecognized', params].pretty_inspect
    end
  end
  
  def quick_create
    @listing = current_user.listings.build :title => params[:title]
    
    if @listing.save
      @map = @listing.build_map
      @map.save(false)
      render :json => { :success => true, :data => { :listing_id => @listing.id } }
    else
      render :json => { :success => false, :data => model_errors(@listing) }
    end
  end
  
  private
  
  def get_listing_relations
    @showing = true
    @map = @listing.map
    @pictures = @listing.pictures
    @special = @listing.specials.first || @listing.specials.new
    @sizes = @listing.sizes
    @facility_features = @listing.facility_features.map(&:label)
    
    if action_name == 'edit'
      @showing = false
      @facility_feature = FacilityFeature.new
      @facility_features = IssnFacilityFeature.labels
      @specials = @listing.specials
    end
  end
  
  def get_client
    @client = @listing.client
  end
  
  def get_map(loc = nil)
    unless (@listing.map.nil? || @listing.map.lat.nil? rescue false) && loc.nil?
      @map = (@listing.try(:map) || loc)
      @Gmap = GoogleMap::Map.new
  		@Gmap.center = GoogleMap::Point.new(@map.lat, @map.lng)
  		@Gmap.zoom = (loc.nil? ? 16 : 12) # 2 miles
  		@Gmap.markers << GoogleMap::Marker.new(:map => @Gmap, 
                                             :lat => @map.lat, 
                                             :lng => @map.lng,
                                             :html => (@listing.nil? ? 'You Are here' : "<strong>#{@listing.title}</strong><p>#{@listing.description}</p>"),
                                             :marker_hover_text => @listing.try(:title),
                                             :marker_icon_path => '/images/ui/map_marker.png')
    end
  end
  
end
