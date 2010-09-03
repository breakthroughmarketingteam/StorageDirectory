class IssnFacilityFeature < ActiveRecord::Base
  # For retrieving the standard set of features for any facility
  
  @@unwanted_features = []
  def self.labels
    self.all.reject { |f| @@unwanted_features.include? f.ShortDescription.downcase }.map(&:ShortDescription).sort || []
  end
  
  def self.update_all_from_issn
    @features = IssnAdapter.get_standard_info('getStdFacilityFeatures')
    
    @features.each do |u|
      facility_feature = self.find_by_ShortDescription(u['sShortDescription']) || self.create
      
      u.each do |name, value|
        name = name.sub /^s/, '' unless name == 'sID'
        facility_feature.update_attribute name, value if facility_feature.respond_to? name
      end
      
    end
  end
end
