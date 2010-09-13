class Feature < ActiveRecord::Base
  
  belongs_to :unit_type
  
  def standard_info
    IssnFacilityFeature.find_by_sID self.StdUnitTypesFeaturesId
  end
  
end
