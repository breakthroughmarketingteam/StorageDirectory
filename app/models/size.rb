class Size < ActiveRecord::Base
  
  belongs_to :listing
  has_one :unit_type
  has_many :rentals
  
  # TODO: this breaks the syncing methods in listing, can we do it differently?
  #validates_presence_of :title, :only => :update
  #validates_numericality_of :width, :length, :price

  attr_accessor :special
  
  def before_save
    self.sqft = self.width * self.length
  end
  
  def self.unit_type_labels
    ['Upper', 'Lower', 'Drive-up']
  end
  
  def self.get_from_unit_size(unit_size)
    return if unit_size.nil?
    self.first :conditions => ['width = ? AND length = ?', unit_size.split('x')[0], unit_size.split('x')[1]]
  end
  
  def self.sqft_from_dims_str(dims)
    return 0 if dims['x'].nil?
    d = dims.split('x').map &:to_i
    d[0] * d[1]
  end
  
  def display_dimensions
    "#{width} x #{length}"
  end
  
  def is_close_to?(size, threshold = 10)
    sq = size.is_a?(String) ? Size.sqft_from_dims_str(size) : size
    self.sqft.between? sq - threshold, sq + threshold
  end
  
  def title_matches?(type)
    self.title =~ /(#{type})|(#{type.split('-').first})|(#{type.sub('-', ' ')})/i
  end
  
  def dollar_price
   self.price / 100.0 rescue 0
  end
  
  def dims
    "#{width}x#{length}"
  end
  
  def full_title
    "#{self.title} #{self.dims}"
  end
  
  def sqft
    width * length unless width.blank?
  end
  
  def storage_type
    case self.title when /(upper)/i
      'Upper'
    when /(lower)/i
      'Lower'
    when /(outside)|(outdoor)|(drive)/i
      'Drive-up'
    end
  end
  
  def icon(size = 'thumb')
    @size_icon ||= SizeIcon.first(:conditions => ['width = ? AND length = ? AND icon_size = ?', width, length, size.to_s]).try :icon
  end
  
  def compare_for_uniq
    { :width => self.width, :length => self.length, :title => self.title.try(:downcase) }
  end
  
  # ISSN methods
  def update_reserve_costs!
    self.unit_type.update_reserve_costs unless self.unit_type.nil?
  end
  
  def owner
    self.listing.client
  end
  
end
