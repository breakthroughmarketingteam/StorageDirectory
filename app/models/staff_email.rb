class StaffEmail < ActiveRecord::Base
  
  belongs_to :listing
  validates_presence_of :email
  access_shared_methods
  
  def title
    self.email
  end
  
end
