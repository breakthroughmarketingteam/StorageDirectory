class Map < ActiveRecord::Base
  
  belongs_to :listing
  acts_as_mappable :auto_geocode => { :field => :full_address, :error_message => 'Could not geocode address' }
  
  validates_presence_of :address, :city, :state, :zip
  validates_numericality_of :zip
  
  access_shared_methods
  attr_reader :full_address
  
  # Instance Methods
  
  def after_update
    auto_geocode_address
  end
  
  def full_address
    "#{address.gsub('#', '')} #{city}, #{state}"
  end
  
end
