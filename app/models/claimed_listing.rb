class ClaimedListing < ActiveRecord::Base
  
  belongs_to :client
  belongs_to :listing
  
  access_shared_methods
  
end
