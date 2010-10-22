class Search < ActiveRecord::Base
  
  belongs_to :listing
  
  validates_presence_of :query
  access_shared_methods
  acts_as_nested_set
  
  def self.build_new(search, geo_location)
    @search = self.new search.merge :zip => (is_zip?(search[:query]) && search[:query].gsub(/\D/, ''))
    
    # geocode the query and set the origin for the find options
    unless @search.query.blank?
      if @search.is_address_query? # has one of zip, city or state
        query_location = Geokit::Geocoders::MultiGeocoder.geocode(@search.query)
        @search.set_location query_location
        
      # must be a facility name query, find a listing and set the query location to the listing's location
      elsif (named_listing = Listing.first(:conditions => ['listings.title LIKE ?', "%#{@search.query}%"]))
        guessed_location = Geokit::Geocoders::MultiGeocoder.geocode(named_listing.map)
        @search.set_location guessed_location
      end
    else # blank search, save the guessed location from the geocoder (ip address)
      @search.set_location geo_location
    end
    
    @search
  end
  
  def is_address_query?
    self.is_zip? || self.is_city? || self.is_state?
  end
  
  @@zip_regex = /\d{5}/
  @@city_regex = Proc.new { |query| /#{query.split(/(,\W?)|(\W*)/) * '|'}/i }
  @@states_regex = States::NAMES.map { |state| "(#{state[0]})|(#{state[1]})" } * '|'
  
  def self.is_zip?(q)
    q.match @@zip_regex
  end
  
  def is_zip?
    self.class.is_zip? self.query
  end
  
  def is_city?
    UsCity.names.any? { |c| c =~ @@city_regex.call(self.query) }
  end
  
  def is_state?
    self.query.match(/#{@@states_regex}/i)
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
  
  def location
    @location ||= GeoKit::GeoLoc.new self
  end
  
  def set_location(location)
    if location.respond_to?(:lat) || location.is_a?(Hash)
      self.lat   = location.respond_to?(:lat) ? location.lat : location[:lat]
      self.lng   = location.respond_to?(:lng) ? location.lng : location[:lng]
      self.city  = location.respond_to?(:city) ? location.city : location[:city]
      self.state = location.respond_to?(:state) ? location.state : location[:state]
      self.zip   = location.respond_to?(:zip) ? location.zip : location[:zip] if self.zip.nil?
    end
  end
  
  def title
    self.attributes.to_query
  end
  
  def lat_lng
    self.lat ? [self.lat, self.lng] : nil
  end
  
  def city_and_state
    "#{self.city}#{', ' + self.state if self.state}" if self.city
  end
  
end
