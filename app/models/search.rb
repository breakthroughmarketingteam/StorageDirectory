class Search < ActiveRecord::Base
  
  validates_presence_of :query
  access_shared_methods
  
  def self.build_from_params(search, request, geo_location)
    @search = self.new search.merge :remote_ip => request.remote_ip, :referrer => request.referrer, :zip => (is_zip?(search[:query]) && search[:query].gsub(/\D/, ''))
    
    # geocode the query and set the origin for the find options
    unless @search.query.blank?
      if is_address_query? @search.query # has one of zip, city or state
        query_location = Geokit::Geocoders::MultiGeocoder.geocode(@search.query)
        @search.build_location query_location
        
      # must be a facility name query, find a listing and set the query location to the listing's location
      elsif (named_listing = Listing.first(:conditions => ['listings.title LIKE ?', "%#{@search.query}%"]))
        guessed_location = Geokit::Geocoders::MultiGeocoder.geocode(named_listing.map)
        @search.build_location guessed_location
      end
    else # blank search, save the guessed location from the geocoder (ip address)
      @search.build_location geo_location
    end
    
    @search
  end
  
  def self.is_address_query?(query)
    query.gsub!('-', ' ')
    is_zip?(query) || is_city?(query) || is_state?(query)
  end
  
  @@zip_regex = /\d{5}/
  @@city_regex = Proc.new { |query| /#{query.split(/(,\W?)|(\W*)/) * '|'}/i }
  @@states_regex = States::NAMES.map { |state| "(#{state[0]})|(#{state[1]})" } * '|'
  
  def self.is_zip?(query)
    query.match @@zip_regex
  end
  
  def self.is_city?(query)
    UsCity.names.any? { |c| c =~ @@city_regex.call(query) }
  end
  
  def self.is_state?(query)
    query.match(/#{@@states_regex}/i)
  end
  
  def self.get_coord_from(coord, location)
    if location.respond_to? coord
      location.send coord
    elsif location.is_a? Hash
      location.send coord
    elsif location.is_a? Array
      coord == :lat ? location[0] : location[1]
    end
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
  
  def build_location(query_location)
    if query_location.lat
      self.lat   = query_location.lat
      self.lng   = query_location.lng
      self.city  = query_location.city
      self.state = query_location.state
      self.zip   = query_location.zip if self.zip.nil?
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
