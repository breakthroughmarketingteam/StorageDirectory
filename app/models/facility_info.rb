class FacilityInfo < ActiveRecord::Base
  
  belongs_to :listing
  validates_presence_of :sFacilityId
  
  after_create :update_from_issn
  
  def update_from_issn
    transaction do
      self.listing.get_facility_info.each do |name, value|
        name = name.sub /^s/, ''
        self.update_attribute name, value if self.respond_to? name
      end
    end
  end

end
