class Size < ActiveRecord::Base
  
  belongs_to :listing
  has_one :unit_type
  
  validates_presence_of :title
  validates_numericality_of :width, :length, :price

  attr_accessor :special
  
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
  
  def icon(size)
    @size_icon ||= SizeIcon.first :conditions => ['width = ? AND length = ? AND icon_size = ?', width, length, size.to_s]
  end
  
end
