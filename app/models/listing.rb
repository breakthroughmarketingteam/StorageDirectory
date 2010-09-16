class Listing < ActiveRecord::Base
  
  belongs_to :client, :foreign_key => 'user_id'
  
  has_one  :map, :dependent => :destroy
  acts_as_mappable :through => :map
  accepts_nested_attributes_for :map
  
  has_many :specials, :dependent => :destroy
  has_many :pictures, :dependent => :destroy
  has_many :sizes, :dependent => :destroy
  has_many :reservations, :dependent => :destroy
  has_many :clicks, :dependent => :destroy
  has_many :impressions, :dependent => :destroy
  
  # OpentTech ISSN data
  has_one  :facility_info, :dependent => :destroy
  has_many :unit_types, :dependent => :destroy
  has_many :units, :class_name => 'FacilityUnit', :through => :unit_types
  has_many :issn_facility_unit_features, :dependent => :destroy
  has_many :promos, :dependent => :destroy
  has_many :facility_features, :dependent => :destroy
  has_many :features, :through => :facility_features
  
  validates_presence_of :title, :message => 'Facility Name can\'t be blank'
  
  access_shared_methods
  acts_as_taggable_on :tags
  
  # Instance Methods
  def accepts_reservations?
    self.client && self.client.accepts_reservations?
  end
  
  def display_special
    self.special && self.special.title ? self.special.title : 'No Specials'
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
  
  def compare_attributes
    attrs = []
    attrs << { :title => self.title }
    attrs << { :reservations => self.client.try(:accepts_reservations?) ? 'Yes' : 'No' }
  end
  
  # create a stat record => clicks, impressions
  def update_stat stat, request
    eval "self.#{stat}.create :referrer => '#{request.referrer}', :request_uri => '#{request.request_uri}'"
  end
  
  def unit_sizes_options_array
    self.sizes.empty? ? IssnUnitTypeSize.labels : self.sizes.map { |s| ["#{s.display_dimensions} #{s.title}", s.display_dimensions] }.uniq
  end
  
  #
  # Search methods
  #
  def self.geo_search(params, session)
    query = extrapolate_query(params)
    sess_loc = [session[:geo_location][:lat].to_f, session[:geo_location][:lng].to_f] rescue nil
    options = {
      :include => [:map, :specials, :sizes, :pictures],
      :within  => (params[:within] || 5)
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
    #@model_data = smart_order(@model_data) if is_city? query
    @model_data = @model_data.paginate :page => params[:page], :per_page => (params[:per_page] || 5)
    { :data => @model_data, :location => @location }
  end
  
  def self.extrapolate_query(params)
    return params[:q] if params[:q]
    return params[:zip] if params[:zip]
    params[:city] ? "#{params[:city].titleize}, #{params[:state].titleize}" : params[:state].titleize rescue ''
  end
  
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
  
  def self.is_zip?(query)
    query.match /\d{5}/ # zip code
  end
  
  def self.is_city?(query)
    UsCity.names.any? { |c| c =~ /#{query.split(/,\W?/) * '|'}/i }
  end
  
  def self.is_state?(query)
    sregex = States::NAMES.map { |s| "(#{s[0]})|\s#{s[1]}$" } * '|'
    query.match(/#{sregex}/i)
  end
  
  def self.smart_order(data)
    data.sort_by { |d| d.impressions_count || 0 }
  end
  
  #
  # OpenTech ISSN wrapper code
  #
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
    self.facility_info.O_FacilityId rescue nil
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
    end
    
    puts "\nALL DATA UPDATED.\n"
  end
  
  def update_facility_info
    puts "\nUpdating Facility Info...\n"
    self.facility_info.nil? ? self.create_facility_info : self.facility_info.update_from_issn
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
        
        type = unit_type.features.first.StdUnitTypesFeaturesShortDescription
      
        args = {
          :width       => unit_type.ActualWidth,
          :length      => unit_type.ActualLength,
          :price       => unit_type.RentalRate * 100, # convert to cents (integer)
          :title       => type,
          :description => (unit_type.features.first.standard_info['sLongDescription'] rescue type)
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