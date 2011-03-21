class ListingsController < ApplicationController
  
  ssl_required :index, :create, :profile, :new, :edit, :update, :quick_create, :disable, :copy_to_all, :add_predefined_size, :request_review, :tracking_request, :sync_issn, :claim_listings
  ssl_allowed :show
  before_filter :get_models_paginated, :only => :index
  before_filter :get_model, :only => [:new, :show, :profile, :edit, :disable, :copy_to_all, :add_predefined_size, :request_review, :tracking_request, :sync_issn]
  before_filter :get_client, :only => [:edit, :profile, :disable, :request_review, :tracking_request, :claim_listings]
  before_filter :get_listing_relations, :only => [:show, :profile]
  before_filter :get_or_create_search, :only => [:home, :locator, :compare, :show, :profile]
  geocode_ip_address :only => [:home, :locator]
  
  def index 
    render :layout => false if request.xhr?
  end
  
  # action is used as the home page of the site (the user navigates to it with a blank url) so we load the page first and then get the results via ajax
  def home
    @page = Page.find_by_title 'Self Storage' # we still need this model for the relations to blocks, etc.
    render :action => 'locator'
  end
  
  def locator
    benchmark do
      # we replaced a normal page model by a controller action, but we still need data from the model to describe this "page"
      @page = Page.find_by_title 'Self Storage' unless request.xhr?
      
      @location = @search.location
      @listings = @search.results params[:strict_order] # this calls the Listing model
      @listings = @listings.paginate :page => params[:page], :per_page => (params[:per_page] || @listings_per_page)
      @map_data = { :center => { :lat => @location.lat, :lng => @location.lng, :zoom => 12 }, :maps => @listings.collect { |listing| @template.map_data_for listing } }
      
      # updates the impressions only for listings on current page if the search has changed
      if @diff_search || (current_user && !current_user.has_role?('admin', 'advertiser'))
        Listing.delay.update_stats @listings, 'impressions', request.referrer, request.request_uri, request.remote_ip unless user_is_a?('admin', 'staff', 'advertiser')
      end
      
      respond_to do |format|
        format.html {}
        format.js do
          if params[:auto_search]
            render :json => { :success => true, :data => { :results => render_to_string(:action => 'locator', :layout => false), :maps_data => @map_data, :query => @search.city_state_and_zip } }
          else
            # implementing this ajax response for the search results 'Show More Results' button
            render :json => { :success => !@listings.blank?, :data => { :listings => _get_listing_partials(@listings), :maps_data => @map_data } }
          end
        end
      end
    end
  end
  
  def compare
    redirect_to :action => :locator and return unless request.xhr?
    
    if params[:ids] && params[:ids].match(/\d+/)
      @listing_set = params[:ids].split('-').map do |ids|
        i = ids.split('x')
        listing = Listing.find_by_id(i[0].to_i)
        { :listing => listing, :size => listing.sizes.find_by_id(i[1].to_i), :special => listing.predefined_specials.find_by_id(i[2].to_i) }
      end
      
      @location = Geokit::Geocoders::MultiGeocoder.geocode(@listing_set.first[:listing].zip.to_s)
      @map_data = { :center => { :lat => @location.lat, :lng => @location.lng, :zoom => 12 }, :maps => @listing_set.map { |s| @template.map_data_for s[:listing] } }
    else
      @listing_set = []
      @location = @search.location
      @map_data = { :center => { :lat => @location.lat, :lng => @location.lng, :zoom => 12 }, :maps => [] }
    end
    
    render :json => { :success => true, :data => { :html => render_to_string(:action => 'compare', :layout => false), :maps_data => @map_data } }
  end

  def show
    unless user_is_a? 'admin', 'advertiser'
      @listing.update_stat 'clicks', request.referrer, request.request_uri, request.remote_ip
      @search.update_attribute :listing_id, @listing.id
    end
    
    render :layout => false if request.xhr?
  end

  def new
    render :layout => false if request.xhr?
  end
  
  def create
    @listing = Listing.new params[:listing]
    @listing.status = 'verified'
    @listing.storage_types = 'self storage'
    @listing.enabled = true
    
    respond_to do |format|
      format.html do
        if @listing.save
          flash[:notice] = "#{@listing.title} created successfully!"
          redirect_to listings_path
        else
          flash[:error] = model_errors @listing
          redirect_to edit_listing_path
        end
      end
      
      format.js do
        if @listing.save
          flash.now[:notice] = "#{@listing.title} created successfully!"
          get_models_paginated
          render :action => 'index', :layout => false
        else
          flash.now[:error] = model_errors @listing
          render :action => 'edit', :layout => false
        end
      end
    end
  end
  
  def profile
    # when a user creates a listing, a partial pops up and they fill in the address and click edit, sending data via GET
    # we intercept those those values here and save it to the map that was created when they clicked new and typed in a title (blur event on the title input)
    unless params[:map].blank?
      @listing.update_attributes params[:map]
      redirect_to(:action => 'edit') and return
    end
    
    @title = "Manage #{@listing.title}"
    @listing.staff_emails.build
    
    render :layout => false if request.xhr?
  end

  def edit
    render :layout => false if request.xhr?
  end
  
  def update
    @listing = (current_user && current_user.has_role?('admin', 'staff')) ? Listing.find(params[:id]) : current_user.listings.find(params[:id])
    
    case params[:from]
    when 'quick_create'
      @listing.update_attributes :enabled => true, :status => 'verified'
      
      if @listing.update_attributes params[:listing]
        render :json => { :success => true, :data => render_to_string(:partial => 'listing', :locals => { :owned => true, :listing => @listing }) }
      else
        render :json => { :success => false, :data => model_errors(@listing) }
      end
      
    when 'uplogo'
      if params[:default_logo]
        @listing.update_attribute(:default_logo, params[:default_logo]) && @listing.logo && @listing.logo.destroy
      elsif params[:listing]
        @listing.update_attributes params[:listing]
      end
      
      render :text => render_to_string(:partial => 'logo_form')
      
    when 'admin'
      if @listing.update_attributes params[:listing]
        get_models_paginated
        render :action => 'index', :layout => false
      else
        render :action => 'edit', :layout => false
      end
      
    when 'toggle_renting'
      @listing.update_attribute :renting_enabled, (params[:toggle] == 'true')
      render :json => { :success => true, :data => { :href => "#{toggle_renting_listing_path(@listing)}?from=toggle_renting&toggle=#{params[:toggle] == 'true' ? 'false' : 'true'}" } }
      
    else # regular update
      _scrub_params
      
      if @listing.update_attributes params[:listing]
        @listing.staff_emails.build
        render :json => { :success => true, :data => (params[:listing_detail] ? render_to_string(:partial => 'edit_detail') : nil) }
      else
        render :json => { :success => false, :data => model_errors(@listing) }
      end
    end
  end
  
  # when a client is adding a listing we save it with the title only and return the id for the javascript
  def quick_create
    @client = (current_user && current_user.has_role?('admin', 'staff')) ? Client.find(params[:client_id]) : current_user
    @listing = params[:id] ? Listing.find(params[:id]) : @client.listings.build(:title => params[:title], :storage_types => 'self storage')
    
    if (@listing.new_record? ? @listing.save : @listing.update_attribute(:title, params[:title]))
      render :json => { :success => true, :data => { :listing_id => @listing.id } }
    else
      render :json => { :success => false, :data => model_errors(@listing) }
    end
  end
  
  def disable
    if (current_user && current_user.has_role?('admin', 'staff')) || @client.listings.any? { |l| l.id == @listing.id }
      @listing.update_attributes :enabled => false, :status => 'disabled'
      render :json => { :success => true }
    else
      render :json => { :success => false, :data => "Sorry, not allowed." }
    end
  end
  
  def copy_to_all
    Listing.delay.update_all_from_this @listing, params[:what]

    render :json => { :success => true }
  rescue => e
    render :json => { :success => false, :data => e.message }
  end
  
  def add_predefined_size
    @predefined_size = PredefinedSize.find params[:predef_id]
    @size = @listing.sizes.build @predefined_size.attributes
    
    if @size.valid?
      render :json => { :success => true, :data => render_to_string(:partial => 'sizes/form', :locals => { :listing => @listing, :size => @size, :predef => true }) }
    else
      render :json => { :success => false, :data => model_errors(@size) }
    end
  end
  
  def request_review
    unless params[:review_request].blank?
      params[:review_request].split(/,|;|^./).reject(&:blank?).map{ |e| e.gsub("\n", '') }.each do |email|
        Notifier.delay.deliver_review_request(email, params[:message], @listing, @client)
      end
      render :json => { :success => true }
    else
      
    end
    
  rescue => e
    render :json => { :success => false, :data => e.message }
  end
  
  def tracking_request
    Notifier.delay.deliver_tracking_request @listing, @client, params[:phone_number]
    msg = "Your request is being processed. Please allow 24 hours for setup. We will email you when it's done."
    
    respond_to do |format|
      format.html do
        flash[:notice] = msg
        redirect_to client_listing_path(@listing)
      end
      
      format.js do
        render :json => { :success => true, :data => msg }
      end
    end
  end
  
  def sync_issn
    @listing.delay.update_unit_types_and_sizes
    render :json => { :success => true }
  end
  
  def claim_listings
    listings = []
    
    unless params[:listing_ids].blank?
      params[:listing_ids].values.each do |id|
        next if id.nil?
        listing = Listing.find_by_id id
        
        if listing
          listings << listing
          @client.claimed_listings.create :listing_id => id
        end
      end
      
      Notifier.delay.deliver_claimed_listings_alert(@client, listings)
    end
    
    render :json => { :success => true, :data => "Thanks for claiming #{listings.size} facilit#{listings.size > 1 ? 'ies' : 'y'}. We will contact you to verify that you really own them. We do this to protect you from would be saboteurs trying to take your listings down. Expect a call from one of us within 24 to 48 hours on business days. Thanks again!" }
  end
  
  private
  
  def get_listing_relations
    @pictures = @listing.pictures
    @reviews = @listing.reviews.published.paginate :per_page => 10, :page => params[:review_page]
    @size = params[:size] ? @listing.sizes.find(params[:size]) : @listing.get_searched_size(@search)
    @special = @listing.predefined_specials.find params[:special] if params[:special]
    
    if in_mode? 'profile'
      @facility_features = FacilityFeature.all.map &:title
      @specials = @listing.specials
      @hours = @listing.business_hours
    end
  end
  
  def get_client
    # i couldnt use #user_allowed? method because one of the listing pages uses a non restful action, and the persmissions system doesnt really support this yet.
    @client = user_is_a?('admin', 'staff') ? (params[:client_id] ? Client.find(params[:client_id]) : @listing.client) : current_user
  end
  
  def get_map
    unless (@listing && @listing.lat.nil?) && @location.nil?
      @map = (@listing || @location)
      @Gmap = GoogleMap::Map.new
  		@Gmap.center = GoogleMap::Point.new(@map.lat, @map.lng)
  		@Gmap.zoom = (@location.nil? ? 16 : 14)
  		@Gmap.markers << GoogleMap::Marker.new(
  		  :map => @Gmap, :lat => @map.lat, :lng => @map.lng,
        :html => @listing.nil? ? '<p><strong>Search distance measured from here.</strong></p>' : "<strong>#{@listing.title}</strong><p>#{@listing.description}</p>",
        :marker_hover_text => @listing.try(:title), :marker_icon_path => 'http://s3.amazonaws.com/storagelocator/images/ui/map_marker.png'
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
  
  def _scrub_params
    if params[:listing] && params[:listing][:staff_emails_attributes]
      params[:listing][:staff_emails_attributes].delete_if { |p| p[1][:email].blank? }
    end
  end
  
end
