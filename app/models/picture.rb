class Picture < ActiveRecord::Base
  
  belongs_to :listing
  has_attached_file :facility_image, 
    :storage => :s3, 
    :s3_credentials => "#{RAILS_ROOT}/config/amazon_s3.yml",
    :styles => { :large => '700x400>', :medium => '480x320#', :thumb => '80x80#' },
    :url => ":s3_domain_url",
    :path => ":attachment/:id/:style_:basename.:extension"
  
  validates_attachment_presence :facility_image
  validates_attachment_content_type :facility_image, :content_type => ['image/png', 'image/jpg', 'image/jpeg',  'image/gif']
  
  access_shared_methods
  
  def image() self.facility_image end
  def image=(i) self.facility_image = i end
  
  def image_url(size = nil)
    if self.facility_image_file_size.blank?
      self.facility_image_file_name
    else
      self.facility_image.url(size)
    end
  end
  
end
