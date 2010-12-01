class Size < ActiveRecord::Base
  
  belongs_to :listing
  has_one :unit_type
  has_many :rentals
  
  # TODO: this breaks the syncing methods in listing, can we do it differently?
  #validates_presence_of :title, :only => :update
  #validates_numericality_of :width, :length, :price

  attr_accessor :special
  
  def self.unit_type_labels
    ['Upper', 'Lower', 'Indoor', 'Outdoor']
  end
  
  def self.get_from_unit_size(unit_size)
    self.first :conditions => ['width = ? AND length = ?', unit_size.split('x')[0], unit_size.split('x')[1]]
  end
  
  def display_dimensions
    "#{width} x #{length}"
  end
  
  def dollar_price
    self.price / 100 rescue 0
  end
  
  def dims
    "#{width}x#{length}"
  end
  
  def sqft
    width * length unless width.blank?
  end
  
  def icon(size = 'thumb')
    @size_icon ||= SizeIcon.first(:conditions => ['width = ? AND length = ? AND icon_size = ?', width, length, size.to_s]).try :icon
  end
  
  # ISSN methods
  def update_reserve_costs!
    self.unit_type.update_reserve_costs unless self.unit_type.nil?
  end
  
end
