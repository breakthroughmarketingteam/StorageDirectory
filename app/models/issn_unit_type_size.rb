class IssnUnitTypeSize < ActiveRecord::Base
  
  # gets an array => ['3x10', '5x10', ...]
  def self.labels
    self.all.sort_by(&:SQFT).map(&:Description) || []
  end
  
  def self.update_from_issn
    args = {
      :data        => IssnAdapter.get_standard_info('getStdUnitTypeSizes'), 
      :model       => self,
      :find_method => 'find_by_Description',
      :find_attr   => 'sDescription'
    }
    IssnAdapter.update_models_from_issn args
  end
  
end
