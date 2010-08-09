class Reservation < ActiveRecord::Base
  
  belongs_to :listing
  belongs_to :user
  
  accepts_nested_attributes_for :comment
  
  acts_as_commentable
  access_shared_methods
  
end
