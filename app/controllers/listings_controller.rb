class ListingsController < ApplicationController

  before_filter :get_models_paginated, :only => :index
  before_filter :get_model, :only => [:show, :edit]
  before_filter :get_client, :only => [:edit]
  before_filter :get_map, :only => [:show, :edit]
  before_filter :get_listing_relations, :only => [:show, :edit]
  
  def index
  end

  def show
    redirect_to facility_path(@listing.title.parameterize, @listing.id) if params[:title] == 'show'
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
    @special = @listing.specials.first || @listing.specials.new
    @map = @listing.map
    @sizes = @listing.sizes.paginate(:per_page => 7, :page => params[:page])
  end
  
  def get_client
    @client = @listing.client
  end
  
  def get_map
    unless @listing.map.nil? || @listing.map.lat.nil?
      @map = @listing.map
      @Gmap = GoogleMap::Map.new
  		@Gmap.center = GoogleMap::Point.new(@map.lat, @map.lng)
  		@Gmap.zoom = 16 # 2 miles
  		@Gmap.markers << GoogleMap::Marker.new(:map => @Gmap, 
                                             :lat => @map.lat, 
                                             :lng => @map.lng,
                                             :html => "<strong>#{@listing.title}</strong><p>#{@listing.description}</p>",
                                             :marker_hover_text => @listing.title,
                                             :marker_icon_path => '/images/ui/map_marker.png')
    end
  end
  
end
