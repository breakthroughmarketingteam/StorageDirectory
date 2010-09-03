class FacilityFeature < ActiveRecord::Base
  
  belongs_to :listing
  access_shared_methods
  
end
