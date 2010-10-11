class AjaxController < ApplicationController
  
  skip_before_filter :authorize_user, :except => [:get_partial, :find_listings, :get_cities]
  skip_before_filter :init
  
  before_filter :validate_params, :except => [:find_listings, :get_client_stats, :get_cities]
  before_filter :_get_model, :only => [:get_model, :get_map_frame, :get_listing, :update, :destroy, :get_multipartial, :model_method]
  before_filter :_get_model_class, :only => [:get_listing, :get_attributes, :model_method]
  
  def get_all
    if (has_name = _get_model_class.first.respond_to?('name')) || _get_model_class.first.respond_to?('title')
      @models = _get_model_class.all(:order => (has_name ? 'name' : 'title'))
    else
      @models = _get_model_class.all
    end
    
    authorize_and_perform_restful_action_on_model @models.first.class.to_controller_str, 'index' do
      render :json => { :success => true, :data => @models }
    end
    
  rescue => e
    render_error e
  end
  
  def get_model
    authorize_and_perform_restful_action_on_model @model.class.to_controller_str, 'show' do
      render :json => { :success => true, :data => @model.attributes }
    end
    
  rescue => e
    render_error e
  end
  
  # find listings in a city or state which don't have an owner
  def find_listings
    company, city, state = *[params[:company], params[:city], params[:state]].map { |p| p.downcase.gsub(/\\|'/) { |c| "\\#{c}" } }
    @listings = Listing.find_listings_by_company_city_and_state company, city, state
    
    render :json => { :success => true, :data => @listings }
  end
  
  def get_listing
    authorize_and_perform_restful_action_on_model @model_class.to_controller_str, 'index' do
      coords = [@model.lat, @model.lng]
      data = { :listing => @model.attributes, :map => @model.map.attributes, :lat => coords.lat, :lng => coords.lng  }
      render :json => { :success => true, :data => data }
    end
    
  rescue => e
    render_error e
  end
  
  def get_client_stats
    @client = Client.find params[:client_id]
    @data = @client.get_stats_for_graph(params[:stats_models].split(/,\W?/), params[:start_date], params[:end_date])
    render :json => { :success => true, :data =>  @data }
  end
  
  # this is called by js to load an iframed map into the map partial in greyresults
  def get_map_frame
    @map = @model.map
    @Gmap = GoogleMap::Map.new
		@Gmap.center = GoogleMap::Point.new @map.lat, @map.lng
		@Gmap.zoom = 13 # 2 miles
		@Gmap.markers << GoogleMap::Marker.new(:map => @Gmap, 
                                           :lat => @map.lat, 
                                           :lng => @map.lng,
                                           :html => "<strong>#{@model.title}</strong><p>#{@model.description}</p>",
                                           :marker_hover_text => @model.title,
                                           :marker_icon_path => '/images/ui/map_marker.png')
    
    @others = Listing.find(:all, :limit => 1, :origin => @map, :within => '3')
    @others.each do |listing|
      @Gmap.markers << GoogleMap::Marker.new(:map => @Gmap, 
                                             :lat => listing.map.lat, 
                                             :lng => listing.map.lng,
                                             :html => "<strong>#{listing.title}</strong><p>#{listing.description}</p>",
                                             :marker_hover_text => listing.title)
    end
    
    render :layout => 'map_frame'
  end
  
  def get_attributes
    authorize_and_perform_restful_action_on_model @model_class.to_controller_str, 'index' do
      render :json => { :success => true, :data => @model_class.column_names }
    end
    
  rescue => e
    render_error e
  end
  
  def model_method
    authorize_and_perform_restful_action_on_model @model_class.to_controller_str, 'index' do
      data = (@model || @model_class).send(params[:model_method])
      render :json => { :success => true }
    end

  rescue => e
    render_error e  
  end
  
  def get_partial
    _get_model_and_locals
    render :json => { :success => true, :data => render_to_string(:partial => params[:partial], :locals => @locals) }
  rescue => e
    render :json => { :success => false, :data => e.message }
  end
  
  def get_multipartial
    render :partial => params[:partial], :locals => { :sub_partial => params[:sub_partial], :locals => { :model => @model } }
    
  rescue => e
    render_error e
  end
  
  def get_cities # state
    render :json => { :success => true, :data => UsCity.tabbed_cities_of(params[:state]) }
  rescue => e
    render_error e
  end
  
  def get_autocomplete
    model_class = params[:model].camelize.constantize
    data = eval "model_class.try :#{params[:method]}"
    render :json => { :success => true, :data => data }
    
  rescue => e
    render_error e
  end
  
  def update
    authorize_and_perform_restful_action_on_model @model.class.to_controller_str, 'update' do
      render :json => { :success => @model.update_attribute(params[:attribute], params[:value]) }
    end
    
  rescue => e
    render_error e
  end
  
  def update_many
    errors = []
    
    params[:models].each do |val, hash|
      model = _get_model(hash[:model], hash[:id])
      
      authorize_and_perform_restful_action_on_model model.class.to_controller_str, 'update' do
        unless model.update_attribute(hash[:attribute], hash[:value])
          errors << "Error updating #{model.class.name} #{model.name_or_title}: #{model_errors(model, false)}"
        end
      end
    end
    
    response = "#{errors * ', '}"
    render :json => { :success => errors.empty?, :data => response }
  rescue => e
    render :json => { :success => false, :data => "Error: #{e.message}" }
  end
  
  def destroy
    authorize_and_perform_restful_action_on_model @model.class.to_controller_str, 'destroy' do
      @model.destroy
      @model.image = nil if @model.respond_to?('image')
    
      render :json => { :success => _get_model.nil? }
    end
    
  rescue => e
    render_error e
  end
  
  private
  
  def authorize_and_perform_restful_action_on_model(resource, action, &block)
    if current_user && current_user.has_permission?(resource, action, params)
      yield
    else
      render :json => { :success => false, :data => "You don't have permission to #{action_name} this #{object_in_question}" }
    end
  end
  
  def object_in_question
    (@model || @models.first).class.name rescue @model_class.name rescue 'Object'
  end
  
  def validate_params
    return if params[:model].nil?
  end
  
  def _get_model(model_str = nil, id = nil)
    @model_str = model_str unless model_str.blank?
    @model = _get_model_class(model_str).find(id || params[:id]) if _get_model_class.exists?(id || params[:id])
  rescue
    nil
  end
  
  def _get_model_class(model_str = nil)
    @model_class ||= (model_str || @model_str || params[:model]).camelcase.constantize
  end
  
  def _get_model_and_locals
    @locals = {}
    @model_class = params[:model].constantize 
    @model = params[:id].blank? ? @model_class.new : @model_class.find(params[:id])
    
    @locals = { params[:model].downcase.to_sym => @model }
    
    if params[:sub_model]
      @sub_model_class = params[:sub_model].constantize
      @sub_model = params[:sub_id].blank? ? @sub_model_class.new : @sub_model_class.find(params[:sub_id])
      @locals.merge!(params[:sub_model].downcase.to_sym => @sub_model)
    end
  rescue
    nil
  end
  
  def render_error(e)
    render :json => { :success => false, :data => e.message }
  end
  
end
