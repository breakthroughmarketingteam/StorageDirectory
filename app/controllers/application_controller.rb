# Filters added to this controller apply to all controllers in the application.
# Likewise, all the methods added will be available for all controllers.
class ApplicationController < ActionController::Base
  helper :all # include all helpers, all the time
  protect_from_forgery # See ActionController::RequestForgeryProtection for details

  # Scrub sensitive parameters from your log
  filter_parameter_logging /(password)|(card_number)|(card_type)|(cvv)|(expires)/i
  helper_method :current_user_session, :current_user, :benchmark, :_crud, :regions, :view_types, :models, :view_types_dir, :blocks_models,           
                :model_blocks_for_region, :rest_methods, :_actions, :_controllers, :_field_types, :_page_actions, :_models_having_assoc,    
                :_models_with_title, :_themes, :_plugins, :_widgets, :_user_hint_places, :in_edit_mode?, :in_mode?, :user_allowed?,
                :reject_blocks_enabled_on_this, :reject_views_enabled_on_this, :reject_forms_enabled_on_this, :use_scripts, :get_coords, 
                :is_admin?, :home_page, :get_list_of_file_names, :_email_templates
  
  include UtilityMethods
  include Geokit
  include SslRequirement
  
  # for the SharedModelMethod module
  # TODO: move this into a theme config or something since not all layouts have all regions
  $regions    = [:header, :content_bottom, :column_5, :more_info, :footer, :head_bar]
  
  # for the virtual forms, build forms
  $_actions     = [:index, :show, :create, :update]
  $_field_types = [:text_field, :text_area, :select, :check_box, :radio, :hidden]
  
  # suggestions form
  $_page_actions = [:index, :show, :new, :edit]
  
  # restful actions for the authorization system
  $_crud = [:all, :create, :read, :update, :delete]
  
  # client account control panel
  $_user_hint_places = [:owner_info, :facilities, :reports, :services, :settings, :listing_detail, :info_tabs, :extras]
  
  # for the geo_search methods in Listing
  $_listing_search_distance = 20
  
  $_usssl_percent_off = 0.1
  $_usssl_discount = "#{($_usssl_percent_off * 100).to_i}% Off"
  $_usssl_phone = '1-305-945-7561'
  $_usssl_google_analytics = 'UA-20270920-1'
  $_pm_softwares = ['Domico', 'Self Storage Manager', 'SiteLink PC', 'SiteLink Web', 'StorageCommander', 'Store 3.1', 'Store 4.0', 'Symbio', 'TaskMaster', 'Total Recall', 'WinSen']
  
  #before_filter :ensure_domain
  before_filter :simple_auth
  before_filter :load_app_config # loads website title and theme, meta info, widgets and plugins
  before_filter :reverse_captcha_check, :only => :create
  before_filter :set_session_vars, :except => [:create, :update, :delete]
  before_filter :get_content_vars
  before_filter :set_default_view_type
  
  layout lambda { app_config[:theme] }
  
  protected # -----------------------------------------------
  
  def render_optional_error_file(status_code)
    status = interpret_status status_code
    render :template => "/errors/#{status[0,3]}.html.erb", :status => status, :layout => 'storagelocator'
  end 
  
  $root_domain = 'usselfstoragelocator.com'
  def ensure_domain
    host = request.env['HTTP_HOST']
    redirect_to "#{request.protocol}#{$root_domain}" if host['www'] || host['secure']
  end
  
  # Pages#show, Listings#home and #locator are allowed by anonymous
  # Clients#new and #create are also allowed by anonymous
  # Posts#create is also allowed by anonymous (submit tip on storage-tips page)
  # kick out anonymous from doing anything else
  def simple_auth
    return if is_admin? && action_name == 'index'
    @allowed = false
    @kickback_to = login_path
    
    # public areas
    if controller_name =~ /(pages)|(email_blasts)/ && action_name == 'show'
      @allowed = true
    elsif controller_name =~/(user_sessions)/
      @allowed = true
    elsif controller_name == 'listings' && %w(home locator show compare).include?(action_name)
      @allowed = true
    elsif controller_name =~ /(posts)|(comments)/ && %w(show create rss).include?(action_name)
      @allowed = true
    elsif controller_name =~ /(rentals)|(clients)/ && %w(new create).include?(action_name)
      @allowed = true
    elsif controller_name == 'ajax'
      @allowed = true
    elsif controller_name == 'admin'
      @allowed = current_user && current_user.has_role?('admin', 'staff')
    # restrict access to everything else by permissions
    elsif current_user
      @allowed = is_admin? ? true : current_user.has_permission?(controller_name, action_name, params, get_model)
    end
    
    unless @allowed
      flash[:error] = 'Access Denied'
      store_location
      redirect_to kick_back_path and return
    end
  end
  
  # display full error message when logged in as an Admin
  def local_request?
    false
    #request.remote_ip == '127.0.0.1' || (current_user && current_user.has_role?('admin')) || RAILS_ENV == 'development'
  end
  
  def self.app_config
    @@app_config
  end
  
  def self.app_config=(config)
    @@app_config = config
  end
  
  def load_app_config
    raw_config   = File.read(RAILS_ROOT + "/config/app_config.yml")
    @@app_config = YAML.load(raw_config)[RAILS_ENV].symbolize_keys
  end
  
  def default_url_options(options = nil)
    ops = { :host => request.host }.merge(options || {})
  end
  
  # hidden field hack_me must pass through empty, cheap reverse captcha trick
  def reverse_captcha_check
    redirect_to(root_path) and return if params.has_key?(:hack_me) && !params[:hack_me].blank?
  end
  
  # we set some return path variables in the session, mostly for the backend.
  # also try to guess which view type would be best by looking at the content's properties
  def set_session_vars
    if params[:return_to]
      session[:return_to] = params[:return_to]
    elsif (current_user.nil? && in_mode?('show')) || (current_user && in_mode?('index', 'edit', 'show'))
      store_location
    end
  end
  
  # instance variables for the helpers and templates
  def get_content_vars
    unless request.xhr?
      @theme_css         = theme_css(session[:theme]  || @@app_config[:theme])
      @plugin_css        = plugin_css 'jquery.ui.css'
      @meta_keywords     = @@app_config[:keywords]    || @@app_config[:title]
      @meta_description  = @@app_config[:description] || @meta_keywords
      #@plugins           = use_scripts(:plugins, (@@app_config[:plugins] || '').split(/,\W?/))
      #@nav_pages         = Page.nav_pages
      @slogan            = 'Locate, Save, <strong>Rent Self Storage Online</strong> Anywhere, Anytime.'
      @user_stat         = UserStat.create_from_request current_user, request if current_user && !is_admin?
    end
         
    @per_page = 20
    @listings_per_page = 20        
    @app_name = 'USSelfStorageLocator.com'                                                  
  end
  
  # TODO: move this feature into the database and save state through AJAX, using a key-val pair { :controller_name => :view_type }
  def set_default_view_type
    model_class = controller_name.singular.camelcase.constantize rescue nil
    
    
    if !params[:view_type].blank?
      session[:view_type] = params[:view_type]
    elsif controller_name == 'site_settings'
      session[:view_type] = 'table'
    elsif controller_name == 'tags' && action_name == 'show'
      session[:view_type] = 'blog_roll'
    elsif controller_name =~ /(posts)/ || controller_name == 'user_hints'
      session[:view_type] = 'list'
    elsif controller_name =~ /(images)|(galleries)|(pictures)|(size_icons)|(ad_partners)/
      session[:view_type] = 'gallery'
    elsif controller_name =~ /(users)$|(clients)|(tenants)/
      session[:view_type] = 'users'
    elsif model_class.respond_to?('column_names') && model_class.column_names.include?('content')
      session[:view_type] = 'table'
    elsif model_class.respond_to?('column_names') && model_class.column_names.include?('image_file_name')
      session[:view_type] = 'box'
    else
      session[:view_type] = 'list'
    end
    
    @default_view_type = session[:view_type]
  end
  
  #--------------------- Fetch Arrays, for select lists, etc. ---------------------
  
  # gets the list of resources for the content menu
  def get_list_of_controllers_for_menu
    @controllers = get_list_of_file_names('app/controllers').reject! { |c| c =~ /^application|^site_settings|^user_sessions|^ajax/i }
    @controllers.map { |c| c.gsub!('_controller', '') }
    @controllers.reject! { |c| !current_user.role.permissions.map(&:resource).include?(c) } unless current_user.has_role?('admin')
  end
  
  def get_list_of_file_names(dir, remove = '.rb')
    Dir.new("#{RAILS_ROOT}/#{dir}").entries.reject { |f| f =~ /^\.|^\.\./i }.map { |f| f.gsub(remove, '') }
  end
  
  def models(for_select = true, plural = true)
    models = get_models_with_name_or_title(get_list_of_file_names('app/models'))
    fetch_array_for models, for_select, plural
  end
  
  # get those data models that respond to name or title
  def get_models_with_name_or_title(model_names)
    model_names.map do |name|
      model_class = name.camelcase.constantize
      next unless model_class.respond_to?('column_names')
      
      model_columns = model_class.column_names
      model_columns.include?('name') || model_columns.include?('title') ? name : nil
    end.reject(&:nil?)
  end
  
  # create, read, update, delete
  def _crud(for_select = true)
    fetch_array_for $_crud, for_select
  end
  
  # get the defined actions for the layout
  def regions(for_select = true)
    fetch_array_for $regions, for_select
  end
  
  # TODO move this to a config file or something
  def view_types_dir() 'views/partials/' end
  def get_view_types
    get_list_of_file_names("/app/views/#{view_types_dir}", '.html.erb').map { |v| v.sub(/^_/, '').to_sym }.select { |f| f.to_s !~ /(grey)|(signup)|(tips)/i }
  end
  
  def _controllers(for_select = true)
    fetch_array_for get_list_of_file_names('app/controllers', '_controller.rb'), for_select
  end
  
  def _actions(for_select = true)
    fetch_array_for $_actions, for_select
  end
  
  def _page_actions(for_select = true)
    fetch_array_for $_page_actions, for_select
  end
  
  def _field_types(for_select = true)
    fetch_array_for $_field_types, for_select
  end
  
  def _email_templates(for_select = true)
    fetch_array_for get_list_of_file_names('app/views/layouts/email_templates', '.html.erb'), for_select
  end
  
  # get a list of view_types, themes, widgets, and plugins
  # TODO: move directory paths to a config, validate themes (they need both a layout file and a css file)
  def view_types(for_select = true) # get the defined view type partials. e.g. views/views/list.html.erb
    fetch_array_for get_view_types, for_select
  end
  
  def _themes(for_select = true)
    fetch_array_for get_list_of_file_names('app/views/layouts', '.html.erb'), for_select
  end
  
  def _plugins(for_select = true)
    fetch_array_for get_list_of_file_names('public/javascripts/plugins', '.js'), for_select
  end
  
  def _widgets(for_select = true)
    fetch_array_for get_list_of_file_names('public/javascripts/widgets', '.js'), for_select
  end
  
  def _user_hint_places(for_select = true)
    fetch_array_for $_user_hint_places.map(&:to_s), for_select
  end
  
  def _models_having_assoc(for_select = false)
    models_array = []
    get_list_of_file_names('app/models').each do |name|
      model_class = name.camelcase.constantize
      next unless model_class.respond_to?('column_names')
      
      model_columns = model_class.column_names
      models_array << name if model_columns.any? { |mc| mc != 'parent_id' && mc =~ /^(.*_id)$/i } || name =~ /(user)|(page)|(tag)/
    end
    
    fetch_array_for models_array, for_select
  end
  
  def _models_with_title(for_select = false)
    models_array = filter_dir_entries('app/models') do |entry|
      model_class = entry.camelcase.constantize
      model_class.respond_to?(:title) || model_class.respond_to?(:name)
    end
    
    fetch_array_for models_array, for_select
  end
  
  def filter_dir_entries(dir, &filter)
    get_list_of_file_names(dir).each do |entry|
      (entries ||= []) << entry if yield(entry)
    end
  end
  
  def fetch_array_for(array, for_select = true, plural = false) # => [ ['Subnav', 'subnav'], ... ]
    for_select ? array.map { |a| (plural ? "#{a}".pluralize : "#{a}").titleize }.zip(array) : array
  end
  
  #--------------------- Model Retrieval ---------------------
  
  # before filters, index
  def get_models
    eval "@#{controller_name} = #{controller_name.singular.camelcase}.all" || []
  end
  
  def get_models_paginated
    @paginated = true
    case params[:filter_by] when 'tag'
      eval "@#{controller_name} = #{controller_name.singular.camelcase}.tagged_with(params[:tag]).paginate :all, :per_page => #{@per_page}, :page => params[:page], :order => 'id desc'"
    else
      eval "@#{controller_name} = #{controller_name.singular.camelcase}.paginate :per_page => #{@per_page || 10}, :page => params[:page], :order => 'id desc'"
    end
  end
  
  # before filters, show
  def get_model
    if action_name == 'new'
      eval "@#{controller_name.singular} = #{controller_name.singular.camelcase}.new"
    else
      eval "@#{controller_name.singular} = #{controller_name.singular.camelcase}.find_by_id(params[:id].to_i)"
    end
  rescue
    nil
  end
  
  def get_model_by_title_or_id
    @model_class = controller_name.singularize.camelcase.constantize
    @model = controller_name.singularize.underscore
    
    eval("@#{@model} = params[:title] ? #{@model_class}.find_by_title_in_params(params[:title].downcase) : #{@model_class}.find_by_id(params[:id].to_i)")
    
    if @model.nil?
      #flash[:warning] = "Page Not Found"
      eval("@#{@model} = @model_class.find_by_title 'Home'")
    end
  end

  # for the shared blocks_model_form
  def get_blocks
    @blocks ||= Block.find :all, :conditions => { :show_in_all => '' }
  end
  
  def get_listing
    case current_user.role.title.downcase.to_sym when :admin
      @listing = Listing.find params[:listing_id]
    when :advertiser
      @listing = current_user.listings.find params[:listing_id]
    end
  end
  
  # get models names that have blocks, for the add_blocks_for helper
  def blocks_models
    @blocks_model = BlocksModel.all.map{ |bm| bm.model_type.downcase }.uniq
  end
  
  def get_active_model
    @active_model ||= eval("@#{controller_name.singular}")
  end
  
  def reject_blocks_enabled_on_this(model, blocks)
    @disabled_blocks ||= reject_models_enabled_on_this(model, blocks)
  end
  
  def reject_views_enabled_on_this(block, views)
    @disabled_views ||= reject_models_enabled_on_this(block, views)
  end
  
  def reject_forms_enabled_on_this(block, forms)
    @disabled_forms ||= reject_models_enabled_on_this(block, forms)
  end
  
  def reject_models_enabled_on_this(model, models)
    disabled_models = (models || []).reject { |me| me.enabled_in? model }
  end
  
  def model_errors(*models)
    models.map { |model| model.errors.full_messages.map(&:to_s) unless model.nil? }.reject(&:blank?).flatten
  end
  
  #--------------------- Authlogic ---------------------
  
  def return_or_back(params)
    params[:return].nil? ? redirect_to(:back) : redirect_to(params[:return])
  end
  
  def current_user_session
    @current_user_session ||= UserSession.find
  end

  def current_user
    @current_user ||= current_user_session ? current_user_session.record : nil
  end
  
  def is_admin?
    current_user && current_user.has_role?('Admin')
  end
  
  def user_allowed?(resource, action, params = {})
    current_user && current_user.has_permission?(resource, action, params)
  end
  
  def require_user
    unless current_user
      store_location
      flash[:error] = "You must be logged in to have #{action_name} access to #{controller_name}"
      redirect_to login_path
      return false
    end
  end

  def require_no_user
    if current_user
      store_location
      flash[:error] = 'You must be logged out to do that'
      redirect_to current_user
      return false
    end
  end
  
  def require_admin
    unless is_admin?
      store_location
      flash[:error] = 'Access Denied'
      redirect_to login_path
      return false
    end
  end
  
  def reset_session
    session
  end
  
  def store_location
    session[:return_to] = request.request_uri
  end
  
  def redirect_back_or_default(default)
    redirect_to(session[:return_to] || default)
    session[:return_to] = nil
  end
  
  # filters
  def clear_empty_blocks_fields
    unless params[controller_name.singularize.to_sym][:blocks_model_attributes].blank?
      params[controller_name.singularize.to_sym][:blocks_model_attributes].reject! do |param|
        param[1][:block_id].blank?
      end
    end
  end
  
  #--------------------- Utility Methods ---------------------
  
  # get the relative path of the first page of the website
  def home_page
    @home_page ||= "/#{(Page.find_by_title('Self Storage') || Page.first(:order => 'position')).title.downcase.parameterize}"
  end
  
  # output a theme css path for the stylesheet_link helper
  def theme_css(name)
    "themes/#{name}/style"
  end
  
  def plugin_css(*names)
    names.map { |name| "plugins/#{name}" }
  end
  
  def refresh_without_params
    redirect_to request.request_uri.split('?')[0]
  end
  
  def geolocation
    @geolocation = session[:geo_location] || cookie[:geo_session]
  end
  
  def use_scripts(type, *scripts)
    scripts.flatten.map { |script| "#{type.to_s}/#{script}" }
  end
  
  def get_default_role
    @default_role ||= Role.find_by_title('User') || Role.find_by_title('Subscriber') || Role.last
  end
  
  def in_edit_mode?
    in_mode? 'edit'
  end
  
  # returns a boolean if the the current action matches any of the action passed in as a string or an array
  def in_mode?(*modes)
    [modes].flatten.any? { |m| action_name == m }
  end
  
  def scrub_blocks_model_attributes_params(attr_name = :place, param_name = :blocks_model_attributes, model_name = controller_name.singular.to_sym)
    p = params[model_name]
    bm = p[param_name] if p
    return unless bm
    
    bm.each do |id, attributes|
      bm.delete id unless attributes[attr_name]
    end
    
    params[model_name][param_name] = bm
  end
  
  def get_or_create_search
    if @search = Search.find_by_id(cookies[:sid].to_i)
      # we want to create a new search everytime to keep track of the progression of a user's habits, but only if they changed some parameter
      @new_search = Search.new((params[:search] || build_search_attributes(params)), request, @search)
      @diff_search = Search.diff? @search, @new_search
      
      if @diff_search
        @new_search.save
        @search.add_child @new_search
        @search = @new_search
      end
    else
      remote_ip = (RAILS_ENV == 'development') ? '65.83.183.146' : request.remote_ip
      session[:geo_location] ||= Geokit::Geocoders::MultiGeocoder.geocode(remote_ip)
      @search = Search.create_from_geoloc(request, session[:geo_location], params[:storage_type])
      @diff_search = true
    end
  
    @search.update_attribute :sort_reverse, (params[:search][:sort_reverse] == '-' ? '+' : '-') if params[:search]
    cookies[:sid] = @search.id
  end
  
  def build_search_attributes(params)
    { 
      :storage_type => params[:storage_type],
      :city         => params[:city],
      :state        => params[:state],
      :zip          => params[:zip],
      :unit_size    => nil,
      :within       => nil
    }
  end
  
  def kick_back_path
    if current_user
      case current_user.role.title when /(admin)/i
        '/admin'
      when /(advertiser)/o
        '/my_account'
      else
        login_path
      end
    else
      login_url
    end
  end
  
  def benchmark(title = "#{controller_name}##{action_name}")
    hr = '**********************************************************************************************************************************'
    cur = Time.now
    result = yield
    print "#{hr}\nBENCHMARK (#{title}): #{cur = Time.now - cur} seconds"
    puts " (#{(cur / $last_benchmark * 100).to_i - 100}% change)\n#{hr}" rescue puts ""
    $last_benchmark = cur
    result
  end
  
end