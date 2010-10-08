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
  
  def size_icon
    @size_icon ||= SizeIcon.first :conditions => ['width = ? AND length = ?', width, length]
  end
  
end
