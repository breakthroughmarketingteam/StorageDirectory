class SizeIcon < ActiveRecord::Base
  
  has_attached_file :icon, 
    :storage => :s3, 
    :s3_credentials => "#{RAILS_ROOT}/config/amazon_s3.yml",
    :url => ":s3_domain_url",
    :path => ":attachment/:id/:style_:basename:extension"
  
  validates_attachment_presence :icon
  validates_attachment_content_type :icon, :content_type => ['image/png', 'image/jpg', 'image/jpeg',  'image/gif']
  
  validates_presence_of :title
  validates_numericality_of :width
  validates_numericality_of :length
  access_shared_methods

  def dimensions
    "#{width}x#{length}"
  end
  
end
