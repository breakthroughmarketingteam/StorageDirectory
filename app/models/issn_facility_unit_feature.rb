class IssnFacilityUnitFeature < ActiveRecord::Base
  
  belongs_to :listing
  belongs_to :unit_type
  
end
