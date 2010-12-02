class Search < ActiveRecord::Base
  
  belongs_to :listing
  
  validates_presence_of :lat, :lng
  access_shared_methods
  acts_as_nested_set
  
  def self.distance_options
    %w(5 10 15 20)
  end
  
  alias_method :old_create, :create
  def self.create(attributes, request, old_search = nil)
    search = self.new attributes, request, old_search
    search.save
    search
  end
  
  # always start with a fat healthy search model, only geocode if query different from last search
  def initialize(attributes, request, old_search = nil)
    super attributes
    self.set_request! request
    self.set_query! if self.query.blank?
    self.set_location!((old_search && (old_search.query == self.query) ? old_search.location : nil)) # geocode when nil
  end
  
  def self.create_from_geoloc(request, loc, storage_type)
    search = self.new({ :storage_type => storage_type }, request)
    search.set_location! loc
    search.save
    search
  end
  
  # check to see if an attribute has changed since last request
  def self.diff?(old_search, new_search)
    old_search.comparable_attributes != new_search.comparable_attributes
  end
  
  def results
    @listings ||= Listing.find_by_location(self)
  end
  
  def comparable_attributes
    self.attributes.select { | k, v| !['id', 'created_at', 'updated_at', 'parent_id', 'lft', 'rgt'].include? k }
  end
  
  def within=(val)
    write_attribute :within, (val || $_listing_search_distance)
  end
  
  def within
    read_attribute(:within) ? read_attribute(:within) : $_listing_search_distance
  end
  
  def unit_size=(val)
    write_attribute :unit_size, (val.blank? ? '5x5' : val)
  end
  
  def storage_type=(val)
    write_attribute :storage_type, (val.try(:titleize) || 'Self Storage')
  end
  
  def location
    @location ||= GeoKit::GeoLoc.new(self)
  end
  
  def set_query!
    self.query = "#{self.city.titleize}#{self.state && ', ' + (self.state.size > 2 ? self.state.upcase : self.state)}" if self.city
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
      
    elsif self.query && (named_listing = Listing.first(:conditions => ['listings.title LIKE ?', "%#{self.query}%"]))
      self.set_location! GeoKit::GeoLoc.new named_listing
      
    else # test ip, we should only be getting here when session[:geo_location] is nil, this happens in localhost
      self.set_location! Geokit::Geocoders::MultiGeocoder.geocode('99.157.198.126')
    end
    self
  end
  
  def set_request!(request)
    self.remote_ip = request.remote_ip
    self.referrer = request.referrer
  end
  
  def sort_reversal
    self.sort_reverse == '+' ? '-' : '+'
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
  def geocode_query(query)
    if self.query.blank?
      Geokit::Geocoders::MultiGeocoder.geocode('99.157.198.126')
    elsif iself.s_address_query? query
      Geokit::Geocoders::MultiGeocoder.geocode query
    elsif (named_listing = Listing.first(:conditions => ['listings.title LIKE ?', "%#{self.query}%"]))
      GeoKit::GeoLoc.new(named_listing.map)
    end
  end
  
  def title
    self.attributes.to_query
  end
  
  def lat_lng
    self.lat ? [self.lat, self.lng] : nil
  end
  
  def full_location
    self.zip? ? self.city_state_and_zip : self.city_and_state
  end
  
  def city_state_and_zip
    "#{self.city_and_state} #{self.zip}"
  end
  
  def city_and_state
    "#{self.city}#{', ' + self.state if self.state}" if self.city
  end
  
end
