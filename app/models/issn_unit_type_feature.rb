class IssnUnitTypeFeature < ActiveRecord::Base
  # For retrieving the standard set of features for any facility
  
  @@unwanted_features = ['normal', 'standard storage', 'lift', 'non storage', 'basement']
  def self.labels
    self.all(:conditions => ['LOWER(ShortDescription) NOT IN (?)', @@unwanted_features]).map(&:ShortDescription).sort
  end
  
  #
  # OpenTech ISSN wrapper code
  #
  require 'issn_adapter'
  
  def self.update_all_from_issn
    IssnUnitTypeFeature.transaction do
      IssnAdapter.get_standard_info('getStdUnitTypeFeatures').each do |u|
        
        unit_type_feature = IssnUnitTypeFeature.find_by_ShortDescription(u['sShortDescription']) || IssnUnitTypeFeature.create
        
        u.each do |name, value|
          name = name.sub /^s/, '' unless name == 'sID'
          unit_type_feature.update_attribute name, value if unit_type_feature.respond_to? name
        end
        
      end
    end
  end
  
end
