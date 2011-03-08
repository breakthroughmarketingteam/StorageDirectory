class Search < ActiveRecord::Base
  
  belongs_to :listing
  
  validates_presence_of :lat, :lng
  access_shared_methods
  acts_as_nested_set
  acts_as_mappable :auto_geocode => { :field => :lat_lng_or_city_state_zip_ir_query, :error_message => 'could not be geocoded' }
  
  def self.distance_options
    %w(5 10 15 20)
  end
  
  def before_create
    # because mysql default values don't seem to work for this model
    if self.storage_type.blank? then self.storage_type = 'self storage' end
    if self.unit_size.blank? then self.unit_size = '5x5' end
    if self.within.blank? then self.within = 20 end
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
    self.set_query! old_search if self.query.blank? && self.lat.blank?
    self.set_location!((old_search && (old_search.query == self.query) && self.lat.blank? ? old_search.location : attributes)) # geocode when nil
    self.set_unit_type! attributes
  end
  
  def self.create_from_geoloc(request, loc, storage_type)
    search = self.new({ :storage_type => storage_type.try(:downcase) }, request)
    search.set_location! loc
    search.set_query!
    search.save
    search
  end
  
  # check to see if an attribute has changed since last request
  def self.diff?(old_search, new_search)
    #raise [old_search.comparable_attributes, new_search.comparable_attributes, old_search.comparable_attributes != new_search.comparable_attributes].pretty_inspect
    old_search.comparable_attributes != new_search.comparable_attributes
  end
  
  def results(strict_order = false)
    @listings ||= Listing.find_by_location(self, strict_order)
  end
  
  def comparable_attributes
    a = self.attributes.select { |k, v| !['id', 'referrer', 'remote_ip', 'sort_reverse', 'created_at', 'updated_at', 'parent_id', 'lft', 'rgt'].include? k }
    a.map { |a| v = a[1]; v.respond_to?(:downcase) ? v.downcase : v }
  end
  
  def location
    @location ||= GeoKit::GeoLoc.new(self)
  end
  
  def full_address
    "#{city}, #{state} #{zip}"
  end
  
  def set_query!(old_search = nil)
    if self.city
      self.query = "#{self.city.titleize}#{self.state && ', ' + (self.state.size > 2 ? self.state.upcase : self.state)}"
    elsif old_search && old_search.query
      self.query = old_search.query
    end
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
      self.set_location! GeoKit::GeoLoc.new(named_listing)
    end
    
    if self.city.blank?
      loc = Geokit::Geocoders::MultiGeocoder.geocode(self.lat_lng.empty? ? self.lat_lng_or_city_state_zip_ir_query : (self.lat_lng * ','))
      self.city = loc.city
      self.state = loc.state
      self.zip = loc.zip
    end
    
    self
  end
  
  def set_request!(request)
    self.remote_ip = request.remote_ip
    self.referrer = request.referrer
  end
  
  def set_unit_type!(attributes = nil)
    self.unit_size = attributes ? (attributes[:unit_size] || '5x5') : '5x5'
    self.within = attributes ? (attributes[:within] || '20') : '20'
  end
  
  def sort_reversal
    self.sort_reverse == '+' ? '-' : '+'
  end
  
  def for_auxilary_listing?
    @aux ||= self.storage_type =~ /(truck)|(moving)/i
  end
  
  def is_address_query?
    @addr ||= self.is_zip? || self.is_city? || self.is_state?
  end
  
  @@zip_regex    = /\d{5}/
  @@city_regex   = lambda { |q| /#{q.split(/(,\W?)|(\W*)/) * '|'}/i }
  @@states_regex = States::NAMES.map { |s| "(#{s[0]})|(#{s[1]})" } * '|'
  
  def self.is_zip?(q)
    q.match @@zip_regex if q
  end
  
  def is_zip?
    @isz ||= self.class.is_zip? self.query
  end
  
  def is_city?
    @isc ||= UsCity.names.any? { |c| c =~ @@city_regex.call(self.query) if self.query }
  end
  
  def is_state?
    @iss ||= self.query.match(/#{@@states_regex}/i) if self.query
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
    elsif self.s_address_query? query
      Geokit::Geocoders::MultiGeocoder.geocode query
    elsif (named_listing = Listing.first(:conditions => ['listings.title LIKE ?', "%#{self.query}%"]))
      GeoKit::GeoLoc.new(named_listing)
    end
  end
  
  def title
    self.storage_type + ' in '+ (self.query.blank? ? self.city_and_state : self.query)
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
  
  def lat_lng_or_city_state_zip_ir_query
    self.lat ? self.lat_lng : self.city ? self.city_state_and_zip : self.query
  end
  
end
