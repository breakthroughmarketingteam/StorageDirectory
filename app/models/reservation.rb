class Reservation < ActiveRecord::Base
  
  belongs_to :listing
  belongs_to :user
  
  has_many :comments
  accepts_nested_attributes_for :comments
  
  acts_as_commentable
  access_shared_methods
  
end
