class Invoice < ActiveRecord::Base
  
  belongs_to :billing_info
  access_shared_methods
  
end
