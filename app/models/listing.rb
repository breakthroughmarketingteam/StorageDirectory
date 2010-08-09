class Listing < ActiveRecord::Base
  
  belongs_to :client, :foreign_key => 'user_id'
  
  has_one  :facility_info
  has_one  :map
  acts_as_mappable :through => :map
  accepts_nested_attributes_for :map
  
  has_many :specials
  has_many :pictures
  has_many :sizes
  
  validates_presence_of :title, :message => 'Facility Name can\'t be blank'
  
  access_shared_methods
  acts_as_taggable_on :tags
  
  # Instance Methods
  
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
  
  def address() self.map.address end
  def city()    self.map.city end
  def state()   self.map.state end
  def zip()     self.map.zip end
    
  def lat() self.map.lat end
  def lng() self.map.lng end
  
  def map_data
    { 
      :title => self.title,
      :thumb => (self.pictures.empty? ? nil : self.pictures.sort_by(&:position).first.image.url(:thumb)),
      :address => self.address,
      :city => self.city,
      :state => self.state,
      :zip => self.zip,
      :lat => self.lat,
      :lng => self.lng
    }
  end
  
  #
  # Search methods
  #
  
  def self.geo_search(params, session)
    q = params[:q]
    options = {
      :page     => params[:page], 
      :per_page => (params[:per_page] || 5),
      :include  => [:map, :specials, :sizes, :pictures],
      :within   => (params[:within]   || 5)
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
    
    @model_data = Listing.paginate(:all, options)
    @model_data.sort_by_distance_from @location if !params[:order] || params[:order] == 'distance'
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
  
  #
  # ISSN wrapper code
  #
  
  def facility_id() self.facility_info.sFacilityId end
  
  def update_facility_info(facility_id)
    
  end

  @@facility_ids = %w(
    a2c018ba-54ca-44eb-9972-090252ef00c5
    42e2550d-e233-dd11-a002-0015c5f270db
  )

  @@username = 'USSL'+ (RAILS_ENV == 'development' ? '_TEST' : '')
  @@password = 'U$$L722'
  @@host = "http://issn.opentechalliance.com"
  @@url = '/issn_ws1/issn_ws1.asmx/'
  @@query = "?sUserLogin=#{@@username}&sUserPassword=#{@@password}"

  include HTTParty
  require 'cobravsmongoose'
  
  def self.findFacilities
    @@query += "&sPostalCode=85021&sCity=&sState=&sStreetAddress=&sMilesDistance=25&sSizeCodes=&sFacilityFeatureCodes=&sSizeTypeFeatureCodes=&sOrderBy="
    
    query = @@host + @@url + 'ISSN_findFacilities' + @@query
    response = self.get query, :format => :xml
    data = CobraVsMongoose.xml_to_hash(response.body)['DataSet'].deep_symbolize_keys[:"diffgr:diffgram"][:NewDataSet][:FindFacility]
    els = []

    data.each do |d|
      els << d["sFacilityID"]["$"]
    end
    
    raise els.pretty_inspect
  end
  
  def self.getFacilityInfo(facility_id = nil)
    facility_id ? facility_id : self.facility_id
    @@query += "&sFacilityId=#{facility_id}&sIssnId="

    query = @@host + @@url + 'ISSN_getFacilityInfo' + @@query
    response = self.get query, :format => :xml
    data = CobraVsMongoose.xml_to_hash(response.body).deep_symbolize_keys
    raise data.pretty_inspect
  end

end
