class Listing < ActiveRecord::Base
  
  belongs_to :client, :foreign_key => 'user_id'
  
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
  
  def lat() map.lat end
  def lng() map.lng end
  
end
