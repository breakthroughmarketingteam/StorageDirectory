class IssnUnitTypeSize < ActiveRecord::Base
  
  # gets an array => ['3x10', '5x10', ...]
  def self.labels
    self.all(:order => 'SQFT').map(&:Description)
  end
  
  #
  # OpenTech ISSN wrapper code
  #
  require 'issn_adapter'
  
  def self.update_all_from_issn
    IssnUnitTypeSize.transaction do
      IssnAdapter.get_standard_info('getStdUnitTypeSizes').each do |u|
      
        unit_type_size = IssnUnitTypeSize.find_by_Description(u['sDescription']) || IssnUnitTypeSize.create
        
        u.each do |name, value|
          name = name.sub /^s/, '' unless name == 'sID'
          unit_type_size.update_attribute name, value if unit_type_size.respond_to? name
        end
        
      end
    end
  end
  
end
