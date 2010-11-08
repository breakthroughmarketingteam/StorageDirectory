class Search < ActiveRecord::Base
  
  belongs_to :listing
  
  validates_presence_of :lat, :lng
  access_shared_methods
  acts_as_nested_set
  
  def self.distance_options
    %w(5 10 15 20)
  end
  
  def self.build_from_path(city, state, zip = nil, request = nil)
    @search = self.new :query => "#{city.gsub!('-', ' ')}, #{state}#{zip && ' '+zip}".titleize, :city => city, :state => state, :zip => zip
    @search.remote_ip, @search.referrer = request.remote_ip, request.referrer if request
    @search.set_location!
  end
  
  def self.create_from_path(city, state, zip = nil, request = nil)
    @search = self.build_from_path city, state, zip, request
    @search.save
    @search
  end
  
  def self.create_from_params(search, geo_location)
    @search = self.build_from_params search, geo_location
    @search.save
    @search
  end
  
  def self.create_from_geoloc(geoloc, storage_type = nil)
    @search = self.build_from_geoloc geoloc, storage_type
    @search.save
    @search
  end
  
  def self.build_from_geoloc(geoloc, storage_type = nil)
    @search = self.new
    # TODO: remove test ip address
    @search.set_location! geoloc || Geokit::Geocoders::MultiGeocoder.geocode('65.83.183.146')
    @search.storage_type = storage_type
    @search.query = "#{@search.city}, #{@search.state}"
    @search
  end
  
  def self.build_from_params(search, geo_location)
    @search = self.new search.merge :zip => (is_zip?(search[:query]) && search[:query].gsub(/\D/, ''))
    
    # geocode the query and set the origin for the find options
    unless @search.query.blank?
      if @search.is_address_query? # has one of zip, city or state
        @search.set_location!
        
      # must be a facility name query, find a listing and set the query location to the listing's location
      elsif (named_listing = Listing.first(:conditions => ['listings.title LIKE ?', "%#{@search.query}%"]))
        @search.set_location! Geokit::Geocoders::MultiGeocoder.geocode(named_listing.map)
      end
    else # blank search, save the guessed location from the geocoder (ip address)
      @search.set_location! geo_location
    end
    
    @search
  end
  
  def location
    @location ||= GeoKit::GeoLoc.new(self)
  end
  
  def set_location!(location = nil)
    if location.respond_to?(:lat) || location.is_a?(Hash)
      self.lat   = location.respond_to?(:lat)   ? location.lat   : location[:lat]
      self.lng   = location.respond_to?(:lng)   ? location.lng   : location[:lng]
      self.city  = location.respond_to?(:city)  ? location.city  : location[:city]
      self.state = location.respond_to?(:state) ? location.state : location[:state]
      self.zip   = location.respond_to?(:zip)   ? location.zip   : location[:zip] if self.zip.nil?
    elsif self.is_address_query?
      self.set_location! Geokit::Geocoders::MultiGeocoder.geocode(self.query)
    end
    self
  end
  
  def is_address_query?
    self.is_zip? || self.is_city? || self.is_state?
  end
  
  @@zip_regex = /\d{5}/
  @@city_regex = Proc.new { |query| /#{query.split(/(,\W?)|(\W*)/) * '|'}/i }
  @@states_regex = States::NAMES.map { |state| "(#{state[0]})|(#{state[1]})" } * '|'
  
  def self.is_zip?(q)
    q.match @@zip_regex if q
  end
  
  def is_zip?
    self.class.is_zip? self.query
  end
  
  def is_city?
    UsCity.names.any? { |c| c =~ @@city_regex.call(self.query) if self.query }
  end
  
  def is_state?
    self.query.match(/#{@@states_regex}/i) if self.query
  end
  
  def extrapolate(part)
    case part when :zip 
      self.query.gsub(/\D/, '') # remove any non digit chars
    when :city
      return self.city if self.city
      
      UsCity.names.each do |city|
        if match = self.query.match(/(#{city})/i)
          return match[0]
        end
      end
    end
  end
  
  # TODO: the default location should be geocoded from the request.remote_ip and stored in the session. Using a test IP right now.
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
  
  def title
    self.attributes.to_query
  end
  
  def lat_lng
    self.lat ? [self.lat, self.lng] : nil
  end
  
  def full_location_if_zip
    self.zip? ? self.city_state_and_zip : self.city_and_state
  end
  
  def city_state_and_zip
    "#{self.city_and_state} #{self.zip}"
  end
  
  def city_and_state
    "#{self.city}#{', ' + self.state if self.state}" if self.city
  end
  
end
