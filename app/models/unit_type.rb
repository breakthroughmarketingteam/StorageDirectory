class UnitType < ActiveRecord::Base
  
  belongs_to :listing
  belongs_to :size
  has_one :feature
  
  def update_feature_from_issn
    @feature = self.feature || self.create_feature
    
    get_features.each do |name, value|
      name = name.sub /^s/, '' unless name == 'sID'
      @feature.update_attribute name, value if @feature.respond_to? name
    end
  end
  
  def get_features
    IssnAdapter.get_unit_features(self.listing.facility_id, self.sID)
  end
  
end
