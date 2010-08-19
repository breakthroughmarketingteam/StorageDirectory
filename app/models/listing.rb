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
  
  def address() self.map.address end
  def city()    self.map.city end
  def state()   self.map.state end
  def zip()     self.map.zip end
    
  def lat() self.map.lat end
  def lng() self.map.lng end
  
  def map_data
    { :id      => self.id,
      :title   => self.title,
      :thumb   => (self.pictures.empty? ? nil : self.pictures.sort_by(&:position).first.image.url(:thumb)),
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
=begin  
  require 'soap/rpc/driver'

  def get_facility_info
     driver = SOAP::RPC::Driver.new(@@host + @@url)
     
     # Add remote sevice methods
     driver.add_method('ISSN_getFacilityInfo', 'sUserLogin', 'sUserPassword', 'sFacilityId', 'sIssnId')
     
     # Call remote service methods
     raise driver.ISSN_getFacilityInfo(@@username, @@password, @@facility_ids[1], '').pretty_inspect
  end
=end
  @@facility_ids = %w(
    a2c018ba-54ca-44eb-9972-090252ef00c5
    42e2550d-e233-dd11-a002-0015c5f270db
  )

  @@username = 'USSL'+ (RAILS_ENV == 'development' ? '_TEST' : '')
  @@password = 'U$$L722'
  @@host = "http://issn.opentechalliance.com"
  @@url = '/issn_ws1/issn_ws1.asmx'
  @@query = "?sUserLogin=#{@@username}&sUserPassword=#{@@password}"

  include HTTParty
  require 'cobravsmongoose'
  
  def self.findFacilities
    @@query += "&sPostalCode=85021&sCity=&sState=&sStreetAddress=&sMilesDistance=25&sSizeCodes=&sFacilityFeatureCodes=&sSizeTypeFeatureCodes=&sOrderBy="
    
    query = @@host + @@url + 'ISSN_findFacilities' + @@query

    $stdout.puts "************** SENDING GET REQUEST *****************"
    $stdout.puts query
    
    response = self.get query, :format => :xml
    body = response.body
    data = CobraVsMongoose.xml_to_hash(response.body)['DataSet'].deep_symbolize_keys[:"diffgr:diffgram"][:NewDataSet][:FindFacility]

    $stdout.puts body
    els = []
    
    data.each do |d|
      els << d["sFacilityID"]["$"]
    end
    
    data
  end

  def prep_soap_request(body)
    @headers = ['Content-Type: application/soap+xml; charset=utf-8' 'Content-Length: length']
    @request = '<?xml version="1.0" encoding="utf-8"?>'+
      '<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">'+
        '<soap12:Body>'+ body +'</soap12:Body>'+
      '</soap12:Envelope>'
  end
  
  def get_facility_info

    prep_soap_request('<ISSN_getFacilityInfo xmlns="INSOMNIAC_Self_Storage_Network">'+
                        '<sUserLogin><string>'+ @@username +'</string></sUserLogin>'+
                        '<sUserPassword><string>'+ @@password +'</string></sUserPassword>'+
                        '<sFacilityId><string>'+ @@facility_ids[1] +'</string></sFacilityId>'+
                        '<sIssnId><string></string></sIssnId>'+
                      '</ISSN_getFacilityInfo>')

    #self.class.headers 'Content-Length' => "#{@request.size}", 'Content-Type' => 'application/soap+xml; charset=utf-8'
    #self.class.default_timeout 120

    http = Net::HTTP.new(@@host, 80)

    headers = {
      'Content-Length' => "#{@request.size}", 'Content-Type' => 'application/soap+xml; charset=utf-8'
    }

    resp, data = http.post(@@url, @request, headers)

    raise [resp, data].pretty_inspect
    # Output on the screen -> we should get either a 302 redirect (after a successful login) or an error page
    
    #$stdout.puts "\n************** SENDING POST REQUEST *****************"
    #$stdout.puts @@host + @@url
    #$stdout.puts self.class.headers.to_a.map { |h| h * ' => ' } * '; ' + "\n"
    #$stdout.puts @request
    
    #response = self.class.post @@host + @@url
    
    #data = CobraVsMongoose.xml_to_hash(response.body).deep_symbolize_keys
    #raise data.pretty_inspect
  end
  
end