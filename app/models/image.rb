class Image < ActiveRecord::Base
  
  belongs_to :user
  has_many :gallery_images, :dependent => :destroy
  has_many :galleries, :through => :gallery_images
  
  has_attached_file :image, 
    :storage => :s3, 
    :s3_credentials => "#{RAILS_ROOT}/config/amazon_s3.yml",
    :styles => { :medium => '700x400>', :thumb => '150x150#' },
    :url => "/:class/gallery/:id/:style_:basename.:extension",
    :path => ":rails_root/public/:class/gallery/:id/:style_:basename.:extension"
  
  validates_presence_of :title
  validates_attachment_presence :image
  validates_attachment_content_type :image, :content_type => ['image/png', 'image/jpg', 'image/jpeg',  'image/gif']
  
  acts_as_commentable
  acts_as_taggable_on :tags, :locations
  access_shared_methods
  
  # Instance Methods
  
  def to_param
    "#{id}-#{title.parameterize}"
  end
  
  def add_to_gallery(params)
    self.gallery_images.build(:gallery_id => params[:gallery_id]) # join table
  end
  
  def pp_image_url(size = nil)
    if self.image_file_size.blank?
      self.image_file_name
    else
      self.image.url size
    end
  end
  
end
