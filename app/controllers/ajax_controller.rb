class AjaxController < ApplicationController
  
  skip_before_filter :init
  ssl_required :get_client_stats, :destroy
  ssl_allowed :get_partial, :get_multipartial, :modeL_method
  before_filter :validate_params, :except => [:find_listings, :get_client_stats, :get_cities]
  before_filter :_get_model, :only => [:get_model, :get_listing, :update, :destroy, :get_multipartial, :model_method]
  before_filter :_get_model_class, :only => [:find, :get_listing, :get_attributes, :model_method]
  
  def get_client_stats
    @client = Client.find params[:client_id]
    data = @client.get_stats_for_graph(params[:stats_models].split(/,\W?/), params[:start_date], params[:end_date])
    json_response true, data
  rescue => e
    render_error "Error loading Activity Tracker: #{e.message.gsub(/<|>/, ' ')}<br />Please contact support if this happens again."
  end
  
  def get_all
    if (has_name = _get_model_class.first.respond_to?('name')) || _get_model_class.first.respond_to?('title')
      @models = _get_model_class.all(:order => (has_name ? 'name' : 'title'))
    else
      @models = _get_model_class.all
    end
    
    authorize_and_perform_restful_action_on_model @models.first.class.to_controller_str, 'index' do
      json_response true, @models
    end
    
  rescue => e
    render_error e
  end
  
  def get_model
    authorize_and_perform_restful_action_on_model @model.class.to_controller_str, 'show' do
      json_response true, @model.attributes
    end
    
  rescue => e
    render_error e
  end
  
  def find
    @found = eval "@model_class.find_all_by_#{params[:by]}('#{params[:value]}')" rescue nil
    json_response true, @found
  rescue => e
    render_error e
  end
  
  # find listings in a city or state which don't have an owner
  def find_listings
    company, city, state = *[params[:company], params[:city], params[:state]].map { |p| p.downcase.gsub(/\\|'/) { |c| "\\#{c}" } } # strip quotes
    @listings = Listing.find_listings_by_company_city_and_state company, city, state
    
    json_response true, @listings
  end
  
  def get_listing
    authorize_and_perform_restful_action_on_model @model_class.to_controller_str, 'index' do
      coords = [@model.lat, @model.lng]
      data = { :listing => @model.attributes, :map => @model.map.attributes, :lat => coords.lat, :lng => coords.lng  }
      json_response true, data
    end
    
  rescue => e
    render_error e
  end
  
  def get_attributes
    authorize_and_perform_restful_action_on_model @model_class.to_controller_str, 'index' do
      json_response true, @model_class.column_names
    end
    
  rescue => e
    render_error e
  end
  
  def model_method
    authorize_and_perform_restful_action_on_model @model_class.to_controller_str, 'index' do
      data = (@model || @model_class).send(params[:model_method])
      json_response
    end

  rescue => e
    render_error e  
  end
  
  def get_partial
    json_response true, render_to_string(:partial => params[:partial], :locals => _get_model_and_locals)
    
  
  end
  
  def get_multipartial
    render :partial => (params[:partial] || '/shared/pop_up'), :locals => { :sub_partial => params[:sub_partial], :locals => { :model => @model } }
    
  rescue => e
    render_error e
  end
  
  def get_cities # state
    json_response true, UsCity.tabbed_cities_of(params[:state])
  rescue => e
    render_error e
  end
  
  def get_autocomplete
    model_class = params[:model].camelize.constantize
    data = eval "model_class.try :#{params[:method]}"
    json_response true, data
    
  rescue => e
    render_error e
  end
  
  def update
    authorize_and_perform_restful_action_on_model @model.class.to_controller_str, 'update' do
      json_response @model.update_attribute(params[:attribute], params[:value])
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
    
    json_response errors.empty?, "#{errors * ', '}"
  end
  
  def destroy
    authorize_and_perform_restful_action_on_model @model.class.to_controller_str, 'destroy' do
      @model.destroy
      @model.image = nil if @model.respond_to?('image')
    
      json_response
    end
    
  rescue => e
    render_error e
  end
  
  private
  
  def authorize_and_perform_restful_action_on_model(resource, action, &block)
    if current_user && current_user.has_permission?(resource, action, params, (@model || _get_model))
      yield
    else
      json_response false, "You don't have permission to #{action_name} this #{object_in_question}"
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
    
    @locals = { params[:model].downcase.to_sym => @model, :pretend_action => params[:pretend_action] }
    
    if params[:sub_model]
      @sub_model_class = params[:sub_model].constantize
      @sub_model = params[:sub_id].blank? ? @sub_model_class.new : @sub_model_class.find(params[:sub_id])
      @locals.merge!(params[:sub_model].downcase.to_sym => @sub_model)
    end
    
    # used by the reserve partial
    @locals.merge!(:show_size_ops => params[:show_size_ops]) if params[:show_size_ops]
    
    @locals
  rescue
    nil
  end
  
  def json_response(status = true, data = nil)
    render :json => { :success => status, :data => data }
  end
  
  def render_error(e)
    render :json => { :success => false, :data => e.respond_to?(:message) ? e.message.gsub(/<|>/, ' ') : e }
  end
  
end
