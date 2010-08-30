class UnitType < ActiveRecord::Base
  
  belongs_to :listing
  
  #
  # OpenTech ISSN wrapper code
  #
  require 'issn_adapter'
  
  def self.update_from_issn(listing)
    UnitType.transaction do
      IssnAdapter.get_facility_info('getFacilityUnitTypes', listing.facility_id).each do |u|
        
        unit_type = listing.unit_types.find_by_sID(u['sID']) || listing.unit_types.create
        
        u.each do |name, value|
          name = name.sub /^s/, '' unless name == 'sID'
          unit_type.update_attribute name, value if unit_type.respond_to? name
        end
        
      end
    end
  end
  
end
