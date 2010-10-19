class Size < ActiveRecord::Base
  
  belongs_to :listing
  has_one :unit_type

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
    width * length
  end
  
  def icon(size)
    @size_icon ||= SizeIcon.first :conditions => ['width = ? AND length = ? AND icon_size = ?', width, length, size.to_s]
  end
  
end
