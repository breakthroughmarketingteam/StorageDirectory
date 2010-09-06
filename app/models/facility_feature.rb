class FacilityFeature < ActiveRecord::Base
  
  belongs_to :listing
  belongs_to :issn_facility_feature, :foreign_key => 'standard_id'
  access_shared_methods
  
  def label
    self.issn_facility_feature.ShortDescription
  end
  
end
