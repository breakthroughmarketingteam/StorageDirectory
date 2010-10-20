class Listing < ActiveRecord::Base
  
  belongs_to :client, :foreign_key => 'user_id'
  
  has_one  :map, :dependent => :destroy
  accepts_nested_attributes_for :map
  
  has_many :specials       , :dependent => :destroy
  has_many :pictures       , :dependent => :destroy
  has_many :reservations   , :dependent => :destroy
  has_many :info_requests  , :dependent => :destroy
  has_many :clicks         , :dependent => :destroy
  has_many :impressions    , :dependent => :destroy
  has_many :reviews        , :class_name => 'Comment', :as => :commentable
  has_many :web_specials   , :dependent => :destroy
  
  has_many :business_hours , :dependent => :destroy
  has_many :access_hours, :class_name => 'BusinessHour', :conditions => "LOWER(hours_type) = 'access'"
  has_many :office_hours, :class_name => 'BusinessHour', :conditions => "LOWER(hours_type) = 'office'"
  
  has_many :sizes, :dependent => :destroy do
    def sorted() all.sort_by &:sqft end
  end
  
  # OpentTech ISSN data
  has_one  :facility_info, :dependent => :destroy
  has_many :unit_types, :dependent => :destroy
  has_many :units, :class_name => 'FacilityUnit', :through => :unit_types
  has_many :issn_facility_unit_features, :dependent => :destroy
  has_many :promos, :dependent => :destroy
  has_many :facility_features, :dependent => :destroy
  has_many :facility_insurances, :dependent => :destroy
  
  validates_presence_of :title, :message => 'Facility Name can\'t be blank'
  
  access_shared_methods
  acts_as_taggable_on :tags
  acts_as_mappable :through => :map
  sitemap
  
  # the most common unit sizes, to display on a premium listing's result partial
  @@upper_types = %w(upper)
  @@drive_up_types = ['drive up', 'outside']
  @@interior_types = %w(interior indoor standard)
  
  # Instance Methods
  
  def display_special
    self.special && self.special.title ? self.special.title : 'No Specials'
  end
  
  def web_special
    self.web_specials.first
  end
  
  def special
    self.specials.first
  end
  
  def get_partial_link(name)
    "/ajax/get_partial?model=Listing&id=#{id}&partial=views/partials/greyresults/#{name.to_s}"
  end
  
  def city_and_state
    self.map.nil? ? [] : [self.map.city, self.map.state]
  end
  
  def get_closest_unit_size(size)
    @unit_size ||= self.available_sizes.detect { |s| s.dims == size } || self.available_sizes.first
  end
  
  def get_upper_type_size(size)
    @upper_type_size ||= self.sizes.find(:all, :conditions => ['width = ? AND length = ?', size.width, size.length]).detect do |s|
      @@upper_types.any? { |type| s.title =~ /(#{type})/i }
    end
  end
  
  def get_drive_up_type_size(size)
    @drive_up_type_size ||= self.sizes.find(:all, :conditions => ['width = ? AND length = ?', size.width, size.length]).detect do |s|
      @@drive_up_types.any? { |type| s.title =~ /(#{type})/i }
    end
  end
  
  def get_interior_type_size(size)
    @interior_type_size ||= self.sizes.find(:all, :conditions => ['width = ? AND length = ?', size.width, size.length]).detect do |s|
      @@interior_types.any? { |type| s.title =~ /(#{type})/i }
    end
  end
  
  def address; self.map.address end
  def city;    self.map.city end
  def state;   self.map.state end
  def zip;     self.map.zip end
  def lat;     self.map.lat end
  def lng;     self.map.lng end
  
  def map_data
    { :id      => self.id,
      :title   => self.title,
      :thumb   => (self.pictures.empty? ? nil : self.pictures.sort_by(&:position).first.facility_image.url(:thumb)),
      :address => self.address,
      :city    => self.city,
      :state   => self.state,
      :zip     => self.zip,
      :lat     => self.lat,
      :lng     => self.lng }
  end
  
  # create a stat record => clicks, impressions
  def update_stat stat, request
    eval "self.#{stat}.create :referrer => '#{request.referrer}', :request_uri => '#{request.request_uri}'"
  end
  
  def unit_sizes_options_array
    self.available_sizes.empty? ? SizeIcon.labels : self.available_sizes.map { |s| ["#{s.display_dimensions} #{s.title}", s.id] }.uniq
  end
  
  def available_sizes
    @available_sizes ||= self.issn_enabled? ? self.sizes.sorted.select { |size| size.unit_type.units_available? } : self.sizes.sorted
  end
  
  def average_rate
    return 'N/A' if self.available_sizes.empty?
    self.available_sizes.map(&:dollar_price).mean
  end
  
  #
  # Search methods
  #
  def self.geo_search(params, session)
    query = extrapolate_query(params)
    sess_loc = [session[:geo_location][:lat].to_f, session[:geo_location][:lng].to_f] rescue nil
    options = {
      :include => [:map, :specials, :sizes, :pictures, :reviews],
      :within  => (params[:within].blank? ? $_listing_search_distance : params[:within])
    }
    
    unless query.blank?
      if is_address_query?(query)
        @location = Geokit::Geocoders::MultiGeocoder.geocode query
        options.merge! :origin => @location
      else # query by name?
        conditions = { :conditions => ['listings.title LIKE ?', "%#{query}%"] }
        options.merge! conditions
        
        unless session[:geo_location].blank?
          options.merge! :origin => sess_loc
        else
          guessed = Listing.first(conditions).map.full_address rescue nil
          @location = Geokit::Geocoders::MultiGeocoder.geocode guessed
          options.merge! :origin => @location
        end
      end
    else
      @location = sess_loc || Geokit::Geocoders::MultiGeocoder.geocode('99.157.198.126')
      options.merge! :origin => @location
    end
    
    @model_data = Listing.all options
    @model_data.sort_by_distance_from @location if params[:order] == 'distance' || params[:order].blank?    
    { :premium => @model_data.select(&:premium?), :regular => @model_data.select(&:unverified?), :location => @location }
  end
  
  def premium?
    self.client && self.client.status == 'active'
  end
  
  def unverified?
    self.client.nil? || self.client.status == 'unverified'
  end
  
  # TODO: work on this to make sure it sorts correctly
  def self.smart_order(data)
    data.sort_by { |d| (d.impressions_count || 0) }
  end
  
  def self.extrapolate_query(params)
    return params[:q] if params[:q]
    return params[:zip] if params[:zip]
    params[:city] ? "#{params[:city].titleize}, #{params[:state].titleize}" : params[:state].titleize rescue ''
  end
  
  # TODO: the default location should be geocoded from the request.ip_address and stored in the session. Using a test IP right now.
  def self.geocode_query(query)
    if query.blank?
      Geokit::Geocoders::MultiGeocoder.geocode('99.157.198.126')
    elsif is_address_query? query
      Geokit::Geocoders::MultiGeocoder.geocode query
    else
      guessed = Listing.first(:conditions => ['listings.title LIKE ?', "%#{query}%"]).map.full_address rescue nil
      Geokit::Geocoders::MultiGeocoder.geocode guessed
    end
  end
  
  def self.is_address_query?(query)
    query.gsub!('-', ' ')
    return true if is_zip?(query)
    return true if is_city?(query)
    is_state?(query)
  end
  
  @@zip_regex = /\d{5}/
  @@city_regex = Proc.new { |query| /#{query.split(/(,\W?)|(\W*)/) * '|'}/i }
  @@states_regex = States::NAMES.map { |state| "(#{state[0]})|(#{state[1]})" } * '|'
  
  def self.is_zip?(query)
    query.match @@zip_regex # zip code
  end
  
  def self.is_city?(query)
    UsCity.names.any? { |c| c =~ @@city_regex.call(query) }
  end
  
  def self.is_state?(query)
    query.match(/#{@@states_regex}/i)
  end
  
  # used in the add your facility process to find listings that the client might own. First look for the facility in the city and then in the state.
  def self.find_listings_by_company_city_and_state(company, city, state)
    self.find_by_sql "SELECT l.id, l.title, m.address, m.city, m.state, m.zip FROM listings l " +
                     "LEFT JOIN maps m ON m.listing_id = l.id " +
                     "LEFT JOIN users u ON u.id = l.user_id " +
                     "WHERE ((LOWER(m.state) LIKE '%#{state}%' " +
                           "AND LOWER(m.city) LIKE '%#{city}%' " +
                           "AND LOWER(l.title) LIKE '%#{company}%') " +
                       "OR (LOWER(m.state) LIKE '%#{state}%' " +
                         "AND LOWER(l.title) LIKE LOWER('%#{company}%')) " +
                       "OR (LOWER(m.city) LIKE '%#{city}%' " +
                         "AND LOWER(l.title) LIKE LOWER('%#{company}%'))) AND l.user_id IS NULL " +
                         "ORDER BY l.title LIMIT 100"
  end
  
  #
  # OpenTech ISSN wrapper code
  #
  def accepts_reservations?
    self.issn_enabled?
  end
  
  def issn_enabled?
    !self.facility_id.blank?
  end
  
  def has_feature?(*features)
    features.any? do |feature|
      self.facility_features.map(&:label).include? feature
    end
  end
  
  def units_available?
    self.units.any? { |u| u.Available.downcase == 'y' }
  end
  
  def facility_id
    self.facility_info.O_FacilityId if self.facility_info
  end
  
  def max_reserve_ahead_days
    self.facility_info.O_MaximumReserveAheadDays if self.facility_info
  end
  
  # args: { :type_id => str:required, :unit_id => str:optional, :promo_code => str:optional, :insurance_id => str:optional }
  def get_move_in_cost(args)
    IssnAdapter.get_move_in_cost self.facility_id, args
  end
  
  # args: { :type_id => str:required, :unit_id => str:optional, :date => str:optional }
  def get_reserve_cost(args)
    IssnAdapter.get_reserve_cost self.facility_id, args
  end
  
  def self.find_facilities(args = {})
    IssnAdapter.find_facilities args
  end
  
  # does not require extra params. methods: getStdFacilityFeatures, getStdUnitTypeFeatures, getStdUnitTypeSizes
  def self.get_standard_info(method = 'getStdFacilityFeatures')
    IssnAdapter.get_standard_info method
  end
  
  # issn methods: getFacilityInfo, getFacilityFeatures, getFacilityDataGroup, getFacilityInsurance, getFacilityPromos, getFacilityUnitTypes
  def get_facility_info(method = 'getFacilityInfo')
    IssnAdapter.get_facility_info method, self.facility_id
  end
  
  def get_facility_insurance
    IssnAdapter.get_facility_insurance self.facility_id
  end
  
  # issn method: getFacilityUnits
  def get_unit_info
    IssnAdapter.get_unit_info self.facility_id
  end
  
  # issn method: getFacilityUnitTypesFeatures
  def get_unit_features(unit_type_id = nil)
    IssnAdapter.get_unit_features self.facility_id, unit_type_id
  end
  
  def process_new_tenant(args)
    IssnAdapter.process_new_tenant(self.facility_id, args)
  end
  
  def process_tenant_payment(args)
    IssnAdapter.process_tenant_payment(self.facility_id, args)
  end
  
  #
  # Methods to sync data from the ISSN db
  #
  def self.update_standard_info
    [IssnUnitTypeSize, IssnUnitTypeFeature, IssnFacilityFeature].map &:update_from_issn
  end
  
  def update_all_issn_data
    transaction do
      update_facility_info
      sync_facility_info_with_listing
      update_unit_types_and_sizes
      update_promos_and_specials
      update_facility_insurance
    end
    
    puts "\nALL DATA UPDATED.\n"
  end
  
  def update_facility_info
    puts "\nUpdating Facility Info...\n"
    self.facility_info.nil? ? self.create_facility_info : self.facility_info.update_from_issn
  end
  
  def update_facility_insurance
    puts "\nUpdating Facility Insurance...\n"
    self.facility_insurances.empty? ? self.facility_insurances.create : self.facility_insurances.update_from_issn
  end
  
  def update_unit_types
    IssnAdapter.update_models_from_issn :class => UnitType,
                                        :data => IssnAdapter.get_facility_info('getFacilityUnitTypes', self.facility_id), 
                                        :model => self.unit_types,
                                        :find_method => 'find_by_sID',
                                        :find_attr  => 'sID'
  end
  
  def update_promos
    IssnAdapter.update_models_from_issn :class => Promo,
                                        :data => IssnAdapter.get_facility_promos(self.facility_id), 
                                        :model => self.promos,
                                        :find_method => 'find_by_Description',
                                        :find_attr => 'sDescription'
  end
  
  def update_unit_types_and_sizes
    puts "\nUpdating Unit Types...\n"
    update_unit_types
    #puts "\nUpdating Unit Features...\n"
    #update_unit_features
    puts "Done.\nSyncing Units With Unit Types...\n"
    sync_units_with_unit_types
    puts "Done.\nSyncing Sizes With Unit Types...\n"
    sync_sizes_with_unit_types
    puts "Done.\nSyncing Costs With Unit Types...\n"
    sync_costs_with_unit_types
    puts "Done.\n"
    true
  end
  
  def update_promos_and_specials
    puts "\nUpdating Promos...\n"
    update_promos
    puts "\nSyncing Specials With Promos ...\n"
    sync_specials_with_promos
  end
  
  def sync_facility_info_with_listing
    puts "\nSyncing Facility Info With Listing...\n"
    @fi = self.facility_info
    transaction do
      self.update_attributes :title =>  @fi.MS_Name, :description =>  @fi.O_FacilityName
      
      Map.transaction(:requires_new => true) do
        self.map.update_attributes :address => @fi.O_Address + (" ##{@fi.O_Address2}" if @fi.O_Address2).to_s,
                                   :city => @fi.O_City,
                                   :state => @fi.O_StateOrProvince,
                                   :zip => @fi.O_PostalCode,
                                   :lat => @fi.O_IssnLatitude,
                                   :lng => @fi.O_IssnLongitude
      end
    end
  end
  
  def sync_costs_with_unit_types
    UnitType.transaction(:requires_new => true) do
      self.unit_types.map &:update_costs
    end
  end
  
  def sync_units_with_unit_types
    UnitType.transaction(:requires_new => true) do
      self.unit_types.map &:update_units
    end
  end
  
  def sync_sizes_with_unit_types
    Size.transaction(:requires_new => true) do
      self.unit_types.each do |unit_type|
        size = self.sizes.find_by_id(unit_type.size_id) || self.sizes.create
        unit_type.update_attribute :size_id, size.id
        unit_type.update_features
        
        type = unit_type.features.first.short_description
      
        args = {
          :width       => unit_type.ActualWidth,
          :length      => unit_type.ActualLength,
          :price       => unit_type.RentalRate * 100, # convert to cents (integer)
          :title       => type,
          :description => (unit_type.features.first.long_description || type)
        }
        size.update_attributes args
      end
    end
  end
  
  def sync_specials_with_promos
    Special.transaction(:requires_new => true) do
      self.promos.each do |promo|
        special = self.specials.find_by_id(promo.special_id) || self.specials.create
        promo.update_attribute :special_id, special.id
        special.update_attributes :title => promo.Description, :code => promo.Code
      end
    end
  end
  
  # for testing
  def purge_issn_data
    self.unit_types = []
    self.promos = []
    self.facility_features = []
    self.save
  end
  
  def purge_own_data
    self.sizes = []
    self.specials = []
    self.save
  end
  
end