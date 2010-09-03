class Listing < ActiveRecord::Base
  
  belongs_to :client, :foreign_key => 'user_id'
  
  has_one  :map
  acts_as_mappable :through => :map
  accepts_nested_attributes_for :map
  
  has_many :specials
  has_many :pictures
  has_many :sizes
  has_many :reservations
  has_many :clicks
  has_many :impressions
  
  # OpentTech ISSN data
  has_one  :facility_info
  has_many :unit_types
  has_many :features, :through => :unit_types, :select => 'DISTINCT(StdUnitTypesFeaturesShortDescription)'
  has_many :facility_features
  
  validates_presence_of :title, :message => 'Facility Name can\'t be blank'
  
  access_shared_methods
  acts_as_taggable_on :tags
  
  # Instance Methods
  def accepts_reservations?
    self.client && self.client.accepts_reservations?
  end
  
  def display_special
    self.special && self.special.content ? self.special.content : 'No Specials'
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
  
  #
  # Search methods
  #
  def self.geo_search(params, session)
    q = extrapolate_query(params)
    options = {
      :include => [:map, :specials, :sizes, :pictures],
      :within  => (params[:within] || 5)
    }
    
    unless q.blank?
      if is_address_query?(q)
        @location = Geokit::Geocoders::MultiGeocoder.geocode(q)
        options.merge! :origin => @location
      else # query by name?
        conditions = { :conditions => ['listings.title LIKE ?', "%#{q}%"] }
        options.merge! conditions
        
        unless session[:geo_location].blank?
          options.merge! :origin => [session[:geo_location][:lat], session[:geo_location][:lng]]
        else
          guessed = Listing.first(conditions).map.full_address rescue nil
          @location = Geokit::Geocoders::MultiGeocoder.geocode(guessed)
          options.merge! :origin => @location
        end
      end
    else
      @location = session[:geo_location] || Geokit::Geocoders::MultiGeocoder.geocode('99.157.198.126')
      options.merge! :origin => @location
    end
    
    @model_data = Listing.all options
    @model_data.sort_by_distance_from @location if !params[:order] || params[:order] == 'distance'
    @model_data = @model_data.paginate :page => params[:page], :per_page => (params[:per_page] || 5)
    { :data => @model_data, :location => @location }
  end

  def self.is_address_query?(query)
    # zip code
    return true if query.match /\d{5}/
    
    # has a state name or abbrev or city name
    sregex = States::NAMES.map { |s| "(#{s[0]})|\s#{s[1]}$" } * '|'
    us_cities = UsCity.all.map { |c| c.name }
    
    query.match(/#{sregex}/i) || us_cities.any? { |c| c =~ /#{query}/i }
  end
  
  def self.extrapolate_query(params)
    return params[:q] unless params[:q].blank?
    params[:city] ? "#{params[:city].titleize}, #{params[:state].titleize}" : params[:state].titleize rescue ''
  end
  
  # args: { :type_id => str:required, :unit_id => str:optional, :promo_code => str:optional, :insurance_id => str:optional }
  def get_move_in_cost(args)
    IssnAdapter.get_move_in_cost self.facility_id, args
  end
  
  # args: { :type_id => str:required, :unit_id => str:optional, :date => str:optional }
  def get_reserve_cost(args)
    IssnAdapter.get_reserve_cost self.facility_id, args
  end
  
  def facility_id
    self.facility_info.O_FacilityId rescue nil
  end
  
  def self.find_facilities(args)
    IssnAdapter.find_facilities(args)
  end
  
  # does not require extra params. methods: getStdFacilityFeatures, getStdUnitTypeFeatures, getStdUnitTypeSizes
  def self.get_standard_info(method = 'getStdFacilityFeatures')
    IssnAdapter.get_standard_info method
  end
  
  # methods: getFacilityInfo, getFacilityFeatures, getFacilityDataGroup, getFacilityInsurance, getFacilityPromos, getFacilityUnitTypes, getFacilityUnits
  def get_facility_info(method = 'getFacilityInfo')
    IssnAdapter.get_facility_info method, self.facility_id
  end
  
  def get_unit_info
    IssnAdapter.get_unit_info self.facility_id
  end
  
  #
  # Methods to sync data from the ISSN db
  #
  def sync_facility_info
    if self.facility_info.nil?
      @facility_info = self.create_facility_info
      @facility_info.update_from_issn
    else
      self.facility_info.sync_with_issn
    end
  end
  
  def update_unit_types_from_issn
    @unit_types = IssnAdapter.get_facility_info('getFacilityUnitTypes', self.facility_id)
    
    @unit_types.each do |u|
      unit_type = self.unit_types.find_by_sID(u['sID']) || self.unit_types.create
      
      u.each do |name, value|
        name = name.sub /^s/, '' unless name == 'sID'
        unit_type.update_attribute name, value if unit_type.respond_to? name
      end
    end
  end
  
  def sync_sizes_with_unit_types
    self.unit_types.each do |unit_type|
      size = self.sizes.find_by_id(unit_type.size_id) || self.sizes.create
      unit_type.update_attribute :size_id, size.id
      unit_type.update_feature_from_issn
      
      size.update_attributes :width     => unit_type.ActualWidth,
                             :length    => unit_type.ActualLength,
                             :price     => unit_type.RentalRate * 100, # convert to cents (integer)
                             :description => unit_type.feature.StdUnitTypesFeaturesShortDescription
    end
  end
  
  def update_specials_from_issn
    @promos = IssnAdapter.get_facility_promos(self.facility_id)
    
    @promos.each do |s|
      special = self.specials.find_by_Description(s['sDescription']) || self.specials.create
      
      s.each do |name, value|
        name = name.sub /^s/, '' unless name == 'sID'
        special.update_attribute name, value if special.respond_to? name
      end
    end
  end
  
end