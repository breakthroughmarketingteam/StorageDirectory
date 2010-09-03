class FacilityInfo < ActiveRecord::Base
  
  belongs_to :listing
  validates_presence_of :sFacilityId
  
  # Methods to sync data from the ISSN db
  def update_from_issn(info = nil)
    FacilityInfo.transaction do
      (info || IssnAdapter.get_facility_info('getFacilityUnitTypes')).each do |name, value|
        name = name.sub /^s/, ''
        self.update_attribute name, value if self.respond_to? name
      end
    end
  end
  
  # TODO: implement more thorough checking of each field
  def sync_with_issn
    info = IssnAdapter.get_facility_info 'getFacilityInfo', self.O_FacilityId
    self.update_from_issn info if info['@diffgr:hasChanges']
  end

end
