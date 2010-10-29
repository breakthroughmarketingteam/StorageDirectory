class ListingsController < ApplicationController

  before_filter :get_models_paginated, :only => :index
  before_filter :get_model, :only => [:show, :edit, :disable]
  before_filter :get_client, :only => [:edit, :disable]
  before_filter :get_map, :only => [:show, :edit]
  before_filter :get_listing_relations, :only => [:show, :edit]
  
  def index 
    render :layout => false if request.xhr?
  end
  
  def locator
    # we replaced a normal page model by a controller action, but we still need data from the model to describe this "page"
    @page = Page.find_by_title 'Self Storage'
    @unit_size_thumbs = SizeIcon.thumb_icons
    @search = Search.new
    
    if params[:storage_type] # clicked on one of the storage types links
      @prev_search = Search.create_from_geoloc session[:geo_location], params[:storage_type]
      
    elsif flash[:search_id] # redirected from the search controller
      @prev_search = Search.find flash[:search_id]
     
    elsif params[:search] # ajax call from the 'show more' button
      @last_search = Search.find session[:search_id] # get the last search so we don't have to geocode again
      @prev_search = Search.create @last_search.attributes.merge(:remote_ip => request.remote_ip, :referrer => request.referrer)
    
    elsif session[:search_id] # reloaded the page?
      @prev_search = Search.find session[:search_id]
    
    else # clicked on a link
      @prev_search = Search.create_from_path params[:city], params[:state], params[:zip], request
    end
    
    if session[:search_id] && !flash[:search_back] && !params[:search]
      @old_search = @last_search.nil? ? Search.find(session[:search_id]) : @last_search
      @old_search.add_child @prev_search
    end
    
    session[:search_id] = @prev_search.id
    @location = @prev_search.location
    get_map
    @listings = Listing.find_by_location @prev_search
    @maps_data = { :center => { :lat => @location.lat, :lng => @location.lng, :zoom => 12 }, :maps => @listings.collect(&:map_data) }
    
    @listings = @listings.paginate :page => params[:page], :per_page => (params[:per_page] || @listings_per_page)
    # updates the impressions only for listings on current page
    @listings.map { |m| m.update_stat 'impressions', request } unless current_user && current_user.has_role?('admin', 'advertiser')
    
    respond_to do |format|
      format.html
      format.js do # implementing this ajax response for the search results 'Show More Results' button
        render :json => { :success => !@listings.blank?, :data => _get_listing_partials(@listings), :maps_data => @maps_data }
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
    
    if session[:search_id]
      @prev_search = Search.find session[:search_id]
      @prev_search.update_attribute :listing_id, @listing.id
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
      @listing.update_attribute :enabled => true
      @map = @listing.map
      
      if @map.update_attributes params[:listing][:map_attributes]
        render :json => { :success => true, :data => render_to_string(:partial => 'listing', :locals => { :owned => true, :listing => @listing }) }
      else
        render :json => { :success => true, :data => model_errors(@map) }
      end
    when 'default_logo'
      @listing.update_attribute :default_logo, params[:default_logo]
      render :json => { :success => true, :data => render_to_string(:partial => 'edit_detail') }
    else
      raise ['params[:from] is nil or unrecognized', params].pretty_inspect
    end
  end
  
  # when a client is adding a listing we save it with the title only and return the id for the javascript
  def quick_create
    @listing = current_user.listings.build :title => params[:title]
    @listing.default_logo = rand(@listing_logos.size)
    
    if @listing.save
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
  
  def get_map
    unless (@listing.map.nil? || @listing.map.lat.nil? rescue false) && @location.nil?
      @map = (@listing.try(:map) || @location)
      @Gmap = GoogleMap::Map.new
  		@Gmap.center = GoogleMap::Point.new(@map.lat, @map.lng)
  		@Gmap.zoom = (@location.nil? ? 16 : 12) # 2 miles
  		@Gmap.markers << GoogleMap::Marker.new(
  		  :map => @Gmap, :lat => @map.lat, :lng => @map.lng,
        :html => @listing.nil? ? '<p><strong>Searc distance measured from here.</strong></p>' : "<strong>#{@listing.title}</strong><p>#{@listing.description}</p>",
        :marker_hover_text => @listing.try(:title), :marker_icon_path => '/images/ui/map_marker.png'
      )
    end
  end
  
  def _get_listing_partials(listings)
    listings.map { |listing| render_to_string :partial => 'listings/result', :locals => { :result => listing } }
  end
  
end
