class ListingsController < ApplicationController

  before_filter :get_models_paginated, :only => :index
  before_filter :get_model, :only => [:show, :edit]
  before_filter :get_client, :only => :edit
  before_filter :get_map, :only => [:show, :edit]
  before_filter :get_listing_relations, :only => [:show, :edit]
  
  def index 
    render :layout => false if request.xhr?
  end
  
  def locator
    # we replaced a normal page model by a controller action, but we still need data from the model to describe this "page"
    @page = Page.find_by_title 'Self Storage'
    @unit_size_thumbs = SizeIcon.thumb_icons
    
    result = Listing.geo_search params, session
    @premium_listings = result[:premium]
    @regular_listings = result[:regular]
    @listings = @premium_listings | @regular_listings
    @location = result[:location]
    @maps_data = { :center => { :lat => @location.lat, :lng => @location.lng, :zoom => 12 }, :maps => @listings.collect(&:map_data) }
    
    get_map @location
    
    @listings = @listings.paginate :page => params[:page], :per_page => (params[:per_page] || @listings_per_page)
    # updates the impressions only for listings on current page
    @listings.map { |m| m.update_stat 'impressions', request } unless current_user && current_user.has_role?('admin', 'advertiser')
    
    # TODO: figure out how to smart order these results
    # if searching by city sort the first page of listings so that the least seen ones are on top
    #@listings = Listing.smart_order(@listings) if params[:page].blank? && (params[:city] || Listing.is_city?(params[:q]))
    
    if session[:location].blank? || params[:q] && params[:state].blank?
      session[:location] = @location.to_hash
      #params_back = {}
      #params_back.merge! :zip => @location.zip if params[:q] && Listing.is_zip?(params[:q])
      #params_back.merge! :within => params[:within] if params[:within]
      #redirect_to storage_state_city_path(@location.state.parameterize, @location.city.parameterize, params_back) and return
    end
    
    respond_to do |format|
      format.html
      format.js do # implementing this ajax response for the search results 'More Link'
        render :json => { :success => !@listings.blank?, :data => prep_hash_for_js(@listings), :maps_data => @maps_data }
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
    @maps_data = { :center => { :lat => @location.lat, :lng => @location.lng, :zoom => 12 }, :maps => @listings.collect(&:map_data) }
  end

  def show
    @listing.update_stat 'clicks', request unless current_user && current_user.has_role?('admin', 'advertiser')
    render :layout => false if request.xhr?
  end

  def new
    render :layout => false if request.xhr?
  end

  def edit
    # when a user creates a listing, a partial pops up and they fill in the address and click edit, sending data via GET
    # we intercept those those values here and save it to the map that was created when they clicked new and typed in a title (blur event on the title input)
    unless params[:map].blank?
      @listing.map.update_attributes params[:map]
      redirect_to(:action => 'edit') and return
    end
    
    render :layout => false if request.xhr?
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
  
  # when a client is adding a listing we save it with the title only and return the id for the javascript
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
    @web_special = in_mode?('show') ? @listing.web_special : (@listing.web_special || @listing.web_specials.build)
    @facility_features = @listing.facility_features.map(&:label)
    
    if action_name == 'edit'
      @showing = false
      @facility_feature = FacilityFeature.new
      @facility_features = IssnFacilityFeature.labels
      @specials = @listing.specials
      @hours = @listing.business_hours
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
  
  def prep_hash_for_js(listings)
    # include listing's related data
    listings.map do |listing|
      res = listing.accepts_reservations?
      mapped = { 
        :info     => listing.attributes, 
        :map      => listing.map.attributes, 
        :specials => listing.specials, 
        :sizes    => listing.available_sizes, 
        :pictures => listing.pictures, 
        :reviews  => listing.reviews, 
        :accepts_reservations => res, 
        :reserve_link_href    => listing.get_partial_link(res ? :reserve : :request_info) 
      }
      mapped[:map].merge! :distance => listing.distance_from(@location)
      mapped
    end
  end
  
end
