class Picture < ActiveRecord::Base
  
  belongs_to :listing
  has_attached_file :image, 
    :styles => { :large => '700x400', :medium => '505x360', :thumb => '80x60#' },
    :url => "/:class/:id/:style_:basename.:extension",
    :path => ":rails_root/public/:class/:id/:style_:basename.:extension"
  
  validates_attachment_presence :image
  validates_attachment_content_type :image, :content_type => ['image/png', 'image/jpg', 'image/jpeg',  'image/gif']
  
  access_shared_methods
  
end
