class ImgAsset < ActiveRecord::Base
  has_attached_file :cdn, 
    :storage => :s3, 
    :s3_credentials => "#{RAILS_ROOT}/config/amazon_s3.yml",
    :url => "/:dir/:basename.:extension",
    :path => "/:dir/:basename.:extension"
  
  validates_attachment_content_type :cdn, :content_type => ['image/png', 'image/jpg', 'image/jpeg',  'image/gif']
  
  Paperclip.interpolates :dir do |attachment, style|
    attachment.instance.orig_dir
  end
end
