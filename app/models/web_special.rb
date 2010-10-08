class WebSpecial < ActiveRecord::Base
  
  belongs_to :listing
  access_shared_methods
  
  validates_presence_of :label, :title
  
end
