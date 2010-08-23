class Listing < ActiveRecord::Base
  
  belongs_to :client, :foreign_key => 'user_id'
  
  has_one  :facility_info
  has_one  :map
  acts_as_mappable :through => :map
  accepts_nested_attributes_for :map
  
  has_many :specials
  has_many :pictures
  has_many :sizes
  has_many :reservations
  has_many :clicks
  has_many :impressions
  
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
  
  #
  # ISSN wrapper code
  #
  require "uri"
  require "net/https"
  
  @@facility_ids = %w(
    a2c018ba-54ca-44eb-9972-090252ef00c5
    42e2550d-e233-dd11-a002-0015c5f270db
    95D25467-04A2-DD11-A709-0015C5F270DB
  )
  
  # for unit with id = 42e2550d-e233-dd11-a002-0015c5f270db
  @@facility_unit_types_ids = %w(
    74e90c41-bf5c-4102-90f2-1cc229f2284d
    ce68c0eb-5c17-4c0a-bfb0-6b7a06b33ed4
    baa1afe5-0d33-4dec-a20b-b765fdd6c260
    23459fec-148d-4d74-97cb-ed3041725d1e
  )

  @@username = 'USSL_TEST'
  @@password = 'U$$L722'
  @@host = "https://issn.opentechalliance.com"
  @@url = '/issn_ws1/issn_ws1.asmx'
  @@query = "?sUserLogin=#{@@username}&sUserPassword=#{@@password}"

  include HTTParty
  require 'cobravsmongoose'
  
  def self.find_facilities
    @@query += "&sPostalCode=85021&sCity=&sState=&sStreetAddress=&sMilesDistance=25&sSizeCodes=&sFacilityFeatureCodes=&sSizeTypeFeatureCodes=&sOrderBy="
    response = call_issn 'ISSN_findFacilities'
    get_data_from_soap_response(response, :FindFacility)
  end
  
  # ISSN methods that only require a facility id
  def get_facility_info(method = 'ISSN_getFacilityInfo')
    @@query += "&sFacilityId=#{@@facility_ids[1]}&sIssnId="
    response = self.class.call_issn method

    case method when 'ISSN_getFacilityInfo', 'ISSN_getFacilityFeatures'
      key = :FacilityFeatures
    when 'ISSN_getFacilityDataGroup'
      key = :FacilityDG
    when 'ISSN_getFacilityInsurance'
      key = :Facility_Insurance
    when 'ISSN_getFacilityPromos'
      key = :Facility_Promos
    when 'ISSN_getFacilityUnitTypes'
      key = :Facility_UnitTypes
    end
    
    data = self.class.get_data_from_soap_response(response, key)
    raise data.pretty_inspect
  end
  
  ## ISSN methods that require a facility id and a sFacilityUnitTypesId
  def get_unit_info(method = 'ISSN_getFacilityUnitTypesFeatures')
    @@query += "&sFacilityId=#{@@facility_ids[1]}&sFacilityUnitTypesId=#{@@facility_unit_types_ids[0]}"
    response = self.class.call_issn method
    
    case method when 'ISSN_getFacilityUnitTypesFeatures'
      key = :Facility_UT_Features
    end
    
    data = self.class.get_data_from_soap_response(response, key)
    raise data.pretty_inspect
  end
  
  # ISSN methods that have std in the name, they dont required further parameters
  def self.get_standard_info(method = 'ISSN_getStdFacilityFeatures')
    response = call_issn method
    
    case method when 'ISSN_getStdFacilityFeatures'
      key = :StdFacilityFeatures
    when 'ISSN_getStdUnitTypeFeatures'
      key = :StdUnitTypeFeatures
    when 'ISSN_getStdUnitTypeSizes'
      key = :StdUnitTypeSizes
    end
    
    data = get_data_from_soap_response(response, key)
    raise data.pretty_inspect
  end
  
  def self.call_issn(method)
    uri = URI.parse(@@host + @@url)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    http.start { |h| h.get(uri.path + '/' + method + @@query) }
  end
  
  # parse the complex soap schema into a simple ruby hash
  def self.get_data_from_soap_response(response, key)
    data = get_soap_data(response.body)[key.to_sym]
    data.is_a?(Array) ? get_data_from_soap_array(data) : get_data_from_soap_hash(data)
  end
  
  def self.get_soap_data(response_body)
    CobraVsMongoose.xml_to_hash(response_body).deep_symbolize_keys[:DataSet][:"diffgr:diffgram"][:NewDataSet]
  end
  
  def self.get_data_from_soap_array(data)
    parsed = []
    data.each do |hash|
      parsed << get_data_from_soap_hash(hash.deep_symbolize_keys) rescue nil
    end
    parsed
  end
  
  def self.get_data_from_soap_hash(data)
    parsed = {}
    data.each { |k, v| parsed.store k, v[:"$"] }
    parsed
  end
  
end