class IssnFacilityFeature < ActiveRecord::Base
  # For retrieving the standard set of features for any facility
  
  @@unwanted_features = []
  def self.labels
    self.all.reject { |f| @@unwanted_features.include? f.ShortDescription.downcase }.map(&:ShortDescription).sort || []
  end
  
  def self.update_from_issn
    args = {
      :data        => IssnAdapter.get_standard_info('getStdFacilityFeatures'),
      :model       => self,
      :find_method => 'find_by_ShortDescription',
      :find_attr   => 'sShortDescription'
    }
    IssnAdapter.update_models_from_issn args
  end
end
