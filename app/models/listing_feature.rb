class ListingFeature < ActiveRecord::Base
  
  belongs_to :listing
  belongs_to :facility_feature
  
end
