class Size < ActiveRecord::Base
  
  belongs_to :listing
  has_one :unit_type
  has_many :rentals
  
  # TODO: this breaks the syncing methods in listing, can we do it differently?
  #validates_presence_of :title, :only => :update
  #validates_numericality_of :width, :length, :price

  @@threshold = 11
  cattr_reader :threshold
  attr_accessor :special
  
  def before_update
    self.sqft = self.width * self.length
  end
  
  def self.unit_type_labels
    ['Upper', 'Lower', 'Drive-up']
  end
  
  def self.get_from_unit_size(unit_size)
    return if unit_size.nil?
    w, h = *unit_size.split('x').map(&:to_i)
    sq = w * h
    self.first :conditions => ['sqft = :sqft OR (sqft < :max AND sqft > :sqft) OR (sqft > :min AND sqft < :sqft)', { :sqft => sq, :max => sq + threshold, :min => sq - threshold }]
  end
  
  def self.sqft_from_dims_str(dims)
    return 0 if dims['x'].nil?
    d = dims.split('x').map &:to_i
    d[0] * d[1]
  end
  
  def display_dimensions
    "#{width} x #{length}"
  end
  
  def is_close_to?(size)
    sq = size.is_a?(String) ? Size.sqft_from_dims_str(size) : size.to_i
    self.sqft.between?(sq - Size.threshold, sq + Size.threshold)
  end
  
  def title_matches?(type)
    self.title =~ /(#{type})/i
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
    @size_icon ||= begin
      s = SizeIcon.first(:conditions => ['sqft = :sqft AND icon_size = :icon', { :sqft => self.sqft, :icon => size }])
      if s.nil?
        s = SizeIcon.first(:conditions => ['((sqft < :max AND sqft > :sqft) OR (sqft > :min AND sqft < :sqft)) AND icon_size = :icon', { :sqft => sqft, :max => sqft + Size.threshold, :min => sqft - Size.threshold, :icon => size }])
      end
      s.try :icon
    end
  end
  
  def compare_for_uniq
    { :sqft => self.sqft, :title => self.title.try(:downcase) }
  end
  
  # ISSN methods
  def update_reserve_costs!
    self.unit_type.update_reserve_costs unless self.unit_type.nil?
  end
  
  def owner
    self.listing.client
  end
  
end
