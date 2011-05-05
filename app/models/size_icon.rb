class SizeIcon < ActiveRecord::Base
  
  has_attached_file :icon, 
    :storage => :s3, 
    :s3_credentials => "#{RAILS_ROOT}/config/amazon_s3.yml",
    :url => ":s3_domain_url",
    :path => ":attachment/:id/:style_:basename.:extension"
  
  validates_attachment_presence :icon
  validates_attachment_content_type :icon, :content_type => ['image/png', 'image/jpg', 'image/jpeg',  'image/gif']
  
  validates_presence_of :title, :icon_size
  validates_numericality_of :width
  validates_numericality_of :length
  access_shared_methods

  def self.medium_icons
    find_all_by_icon_size 'medium', :order => 'sqft'
  end
  
  def self.thumb_icons
    find_all_by_icon_size 'thumb', :order => 'sqft'
  end
  
  def self.labels
    @labels ||= self.all.map(&:dimensions).uniq
  end
  
  def self.icons_sizes
    %w(thumb medium large)
  end

  def dimensions
    "#{width}x#{length}"
  end
  
  def image
    icon
  end
  
  def image=(i)
    icon = i
  end
  
end
