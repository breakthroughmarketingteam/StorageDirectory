class UnitType < ActiveRecord::Base
  
  belongs_to :listing
  belongs_to :size
  has_one :feature, :dependent => :destroy
  
  def update_feature
    Feature.transaction(:requires_new => true) do
      @feature = self.feature || self.create_feature
    
      get_feature.each do |name, value|
        next if name.is_a?(Hash)
        name = name.sub /^s/, '' unless name == 'sID'
        @feature.update_attribute name, value if @feature.respond_to? name
      end
    end
  end
  
  def get_feature
    IssnAdapter.get_unit_features(self.listing.facility_id, self.sID)
  end
  
end
