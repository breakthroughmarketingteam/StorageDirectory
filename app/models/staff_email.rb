class StaffEmail < ActiveRecord::Base
  
  belongs_to :listing
  validates_presence_of :email
  
end
