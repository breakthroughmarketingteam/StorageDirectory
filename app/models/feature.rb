class Feature < ActiveRecord::Base
  
  belongs_to :unit_type
  
  def standard_info
    @features = Listing.get_standard_info('getStdUnitTypeFeatures')
    @features.detect { |f| f['sID'] == self.StdUnitTypesFeaturesId }
  end
  
end
