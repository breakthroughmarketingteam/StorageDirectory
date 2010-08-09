class FacilityInfo < ActiveRecord::Base
  
  belongs_to :listing
  validates_presence_of :sFacilityId
  
end
