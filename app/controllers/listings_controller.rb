class ListingsController < ApplicationController

  before_filter :get_models_paginated, :only => :index
  before_filter :get_model, :only => [:show, :edit, :disable]
  before_filter :get_client, :only => [:edit, :disable]
  before_filter :get_listing_relations, :only => [:show, :edit]
  
  geocode_ip_address :only => :locator
  
  def index 
    render :layout => false if request.xhr?
  end
  
  # when a user navigates to the home page we shall redirect them back to them same page but with their city and state in the path (geocode by IP)
  def cleaner
    @search = Search.find_by_id(session[:search_id]) || Search.create_from_geoloc(request, session[:geo_location], params[:storage_type])
    session[:search_id] = @search.id
    localized_path = params[:storage_type] ? _storage_type_path(params[:storage_type], @search) : self_storage_path(@search.state, @search.city.parameterize)
    redirect_to localized_path
  end
  
  def locator
    # we replaced a normal page model by a controller action, but we still need data from the model to describe this "page"
    @page = Page.find_by_title 'Self Storage' unless request.xhr?
    @search = Search.find_by_id session[:search_id]
    
    if @search
      # we want to create a new search everytime to keep track of the progression of a user's habits
      @new_search = Search.new((params[:search] || _build_search_attributes(params)), request, @search)
      
      if Search.diff? @search, @new_search
        @new_search.save
        @search.add_child @new_search
        @search = @new_search
      end
    else
      @search = Search.create({ :city => params[:city], :state => params[:state], :zip => params[:zip], :storage_type => params[:storage_type] }, request)
    end
    
    session[:search_id] = @search.id
    @location = @search.location
    get_map
    @listings = @search.results # this calls the Listing model
    @maps_data = { :center => { :lat => @location.lat, :lng => @location.lng, :zoom => 14 }, :maps => @listings.collect(&:map_data) }
    @listings = @listings.paginate :page => params[:page], :per_page => (params[:per_page] || @listings_per_page)
    
    # updates the impressions only for listings on current page
    @listings.map { |m| m.update_stat 'impressions', request } unless current_user && current_user.has_role?('admin', 'advertiser')
    
    respond_to do |format|
      format.html {}
      format.js do
        if params[:auto_search]
          render :json => { :success => true, :data => { :results => render_to_string(:action => 'locator', :layout => false), :maps_data => @maps_data } }
        else
          # implementing this ajax response for the search results 'Show More Results' button
          render :json => { :success => !@listings.blank?, :data => _get_listing_partials(@listings), :maps_data => @maps_data }
        end
      end
    end
  end
  
  def compare
    #if params[:ids] && params[:ids].match(/\d+/)
    #  session[:compare_listing_ids] = params[:ids].split(',').reject(&:blank?)
    #  redirect_to compare_listings_path(:ids => '')
    #end
    if params[:ids] && params[:ids].match(/\d+/)
      @listings = Listing.find(params[:ids].split(',').reject(&:blank?))
      @location = Geokit::Geocoders::MultiGeocoder.geocode(@listings.first.map.full_address)
      @maps_data = { :center => { :lat => @location.lat, :lng => @location.lng, :zoom => 12 }, :maps => @listings.collect(&:map_data) }
      @comparables = { :online_rentals => :self, :monthly_rates => Listing.top_types, :specials => :self, :features => :self }
      
      render :json => { :success => true, :data => { :html => render_to_string(:action => 'compare', :layout => false), :maps_data => @maps_data } }
    else
      
    end
  end

  def show
    @listing.update_stat 'clicks', request unless current_user && current_user.has_role?('admin', 'advertiser')
    
    if session[:search_id]
      @search = Search.find session[:search_id]
      @search.update_attribute :listing_id, @listing.id
    end
    
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
    @listing = is_admin? ? Listing.find(params[:id]) : current_user.listings.find(params[:id])
    
    case params[:from]
    when 'quick_create'
      @listing.update_attribute :enabled, true
      @map = @listing.map
      
      if @map.update_attributes params[:listing][:map_attributes]
        render :json => { :success => true, :data => render_to_string(:partial => 'listing', :locals => { :owned => true, :listing => @listing }) }
      else
        render :json => { :success => false, :data => model_errors(@map) }
      end
      
    when 'uplogo'
      if params[:default_logo]
        @listing.update_attribute :default_logo, params[:default_logo]
        render :json => { :success => true, :data => render_to_string(:partial => 'edit_detail') }
      elsif params[:listing]
        @listing.update_attributes params[:listing]
        render :json => { :success => false, :data => model_errors(@listing) }
      end
      
    else
      raise ['params[:from] is nil or unrecognized', params].pretty_inspect
    end
  end
  
  # when a client is adding a listing we save it with the title only and return the id for the javascript
  def quick_create
    @listing = params[:id] ? Listing.find(params[:id]) : current_user.listings.build(:title => params[:title])
    
    if (@listing.new_record? ? @listing.save : @listing.update_attribute(:title, params[:title]))
      @map = @listing.build_map
      @map.save(false)
      render :json => { :success => true, :data => { :listing_id => @listing.id } }
    else
      render :json => { :success => false, :data => model_errors(@listing) }
    end
  end
  
  def disable
    if is_admin? || @client.listings.any? { |l| l.id == @listing.id }
      @listing.update_attributes :enabled => false, :status => 'disabled'
      render :json => { :success => true }
    else
      render :json => { :success => false, :data => "Sorry, not allowed." }
    end
  end
  
  private
  
  def get_listing_relations
    @showing = true
    @map = @listing.map
    @pictures = @listing.pictures
    @special = @listing.specials.first || @listing.specials.new
    @web_special = in_mode?('show') ? @listing.web_special : (@listing.web_special || @listing.web_specials.build)
    @facility_features = @listing.facility_features.map(&:label).reject(&:blank?)
    
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
  
  def get_map
    unless (@listing && @listing.lat.nil?) && @location.nil?
      @map = (@listing.try(:map) || @location)
      @Gmap = GoogleMap::Map.new
  		@Gmap.center = GoogleMap::Point.new(@map.lat, @map.lng)
  		@Gmap.zoom = (@location.nil? ? 16 : 14)
  		@Gmap.markers << GoogleMap::Marker.new(
  		  :map => @Gmap, :lat => @map.lat, :lng => @map.lng,
        :html => @listing.nil? ? '<p><strong>Search distance measured from here.</strong></p>' : "<strong>#{@listing.title}</strong><p>#{@listing.description}</p>",
        :marker_hover_text => @listing.try(:title), :marker_icon_path => '/images/ui/map_marker.png'
      )
    end
  end
  
  def _get_listing_partials(listings)
    listings.map { |listing| render_to_string :partial => 'listings/result', :locals => { :result => listing } }
  end
  
  def _location_with_fallback
    return session[:geo_location] if session[:geo_location]
    session[:geo_location] = Geokit::Geocoders::MultiGeocoder.geocode(request.remote_ip == '127.0.0.1' ? '65.83.183.146' : request.remote_ip)
  end
  
  def _storage_type_path(type, search)
    "/#{type.parameterize}/#{search.state.parameterize}/#{search.city.parameterize}"
  end
  
  def _build_search_attributes(params)
    { :city => params[:city], :state => params[:state], :zip => params[:zip], :unit_size => nil, :storage_type => params[:storage_type], :within => nil }
  end
  
end
