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
  
end
