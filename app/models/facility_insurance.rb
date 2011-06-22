class FacilityInsurance < ActiveRecord::Base
  
  belongs_to :listing  
  after_create :update_from_issn
  
  def update_from_issn
    fi = self.listing.get_facility_insurance
    
    transaction do
      fi.is_a?(Array) ? fi.each { |f| fi_iterator f } : fi_iterator(fi)
    end
  end
  
  def fi_iterator(fi)
    fi.each do |name, value|
      name = name.sub /^s/, '' unless name == 'sID'
      self.update_attribute name, value if self.respond_to? name
    end
  end
  
end
