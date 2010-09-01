class Special < ActiveRecord::Base
  
  belongs_to :listing
  
  #
  # OpenTech ISSN wrapper code
  #
  require 'issn_adapter'
  
  def self.update_from_issn(listing)
    Special.transaction do
      IssnAdapter.get_facility_promos(listing.facility_id).each do |p|
      
        promo = listing.specials.find_by_Description(p['sDescription']) || listing.specials.create
        
        p.each do |name, value|
          name = name.sub /^s/, '' unless name == 'sID'
          promo.update_attribute name, value if promo.respond_to? name
        end
        
      end
    end
  end
  
end
