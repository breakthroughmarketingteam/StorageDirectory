class FacilityInsurance < ActiveRecord::Base
  
  belongs_to :listing  
  after_create :update_from_issn
  
  def update_from_issn
    fi = self.listing.get_facility_insurance
    return unless fi['sErrorMessage'].blank?
    
    transaction do
      fi.each do |name, value|
        name = name.sub /^s/, '' unless name == 'sID'
        self.update_attribute name, value if self.respond_to? name
      end
    end
  end
  
end
