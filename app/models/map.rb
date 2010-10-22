class Map < ActiveRecord::Base
  
  belongs_to :listing
  acts_as_mappable :auto_geocode => { :field => :full_address, :error_message => 'Could not geocode address' }
  
  validates_presence_of :address, :city, :state, :zip
  validates_numericality_of :zip
  
  access_shared_methods
  attr_reader :full_address
  
  def self.top_cities(limit = 50)
    self.find_by_sql "SELECT city AS name, state, COUNT(maps.id) AS map_count FROM maps GROUP BY name, state ORDER BY map_count DESC LIMIT #{limit}"
  end
  
  # Instance Methods
  
  def before_save
    auto_geocode_address if self.zip || self.city
  end
  
  def full_address
    "#{address.gsub('#', '')} #{city}, #{state}"
  end
  
end
