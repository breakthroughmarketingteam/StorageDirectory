class ListingDescription < ActiveRecord::Base
  
  belongs_to :client
  belongs_to :listing
  
end
