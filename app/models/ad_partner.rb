class AdPartner < ActiveRecord::Base
  
  has_attached_file :image, 
    :storage => :s3, 
    :s3_credentials => "#{RAILS_ROOT}/config/amazon_s3.yml",
    :styles => { :thumb => '80x80#' },
    :url => ":s3_domain_url",
    :path => ":attachment/:id/:style_:basename.:extension"
  
  validates_presence_of :title, :url
  validates_attachment_presence :image
  validates_attachment_content_type :image, :content_type => ['image/png', 'image/jpg', 'image/jpeg',  'image/gif']
  
  access_shared_methods

  named_scope :all_enabled, :conditions => 'enabled IS TRUE'

  def html_attributes
    to_hash(read_attribute :html_attributes)
  end
  
  def image_url
    if self.image_file_size
      self.image.url :thumb
    else
      self.image_file_name
    end
  end
  
  def to_hash(str)
    s= eval "#{str}"
  end
  
end
