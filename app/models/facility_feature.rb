class FacilityFeature < ActiveRecord::Base
  
  belongs_to :listing
  belongs_to :issn_facility_feature, :foreign_key => 'standard_id'
  access_shared_methods
  
  # TODO: fix the standard storage feature which doesn't have a relation to an issn feature
  def label
    self.issn_facility_feature.try :ShortDescription rescue 'Standard Storage'
  end
  
  def like?(type)
    self.title.downcase == type.downcase || self.description =~ /(#{type})/i
  end
  
end
