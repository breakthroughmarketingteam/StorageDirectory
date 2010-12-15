class UnitType < ActiveRecord::Base
  
  belongs_to :listing
  belongs_to :size
  has_many :features, :dependent => :destroy
  has_many :units, :class_name => 'FacilityUnit', :dependent => :destroy
  has_many :move_in_costs, :dependent => :destroy
  has_many :reserve_costs, :dependent => :destroy
  
  def units_available?
    self.units.any? { |u| (u.Available || '').downcase == 'y' }
  end
  
  def reserve_cost
    self.reserve_costs.first
  end
  
  def update_costs
    self.update_move_in_costs and self.update_reserve_costs
  end
  
  def update_move_in_costs
    IssnAdapter.update_models_from_issn :class       => MoveInCost,
                                        :data        => [self.get_move_in_costs].flatten, 
                                        :model       => self.move_in_costs,
                                        :find_method => 'find_by_Description',
                                        :find_attr   => 'sDescription'
  end
  
  def update_reserve_costs
    IssnAdapter.update_models_from_issn :class       => ReserveCost,
                                        :data        => [self.get_reserve_costs].flatten, 
                                        :model       => self.reserve_costs,
                                        :find_method => 'find_by_FeeDescription',
                                        :find_attr   => 'sFeeDescription'
  end
  
  # args: { :type_id => str:required, :unit_id => str:optional, :promo_code => str:optional, :insurance_id => str:optional }
  def get_move_in_costs(args = {})
    query = args.merge(:type_id => self.sID)
    IssnAdapter.get_move_in_cost self.listing.facility_id, query
  end
  
  # args: { :type_id => str:required, :unit_id => str:optional, :date => str:optional }
  def get_reserve_costs(args = {})
    query = args.merge(:type_id => self.sID)
    IssnAdapter.get_reserve_cost self.listing.facility_id, query
  end
  
  def update_features
    Feature.transaction(:requires_new => true) do
      get_features.flatten.each do |feature|
        unit_feature = self.features.find_by_sID(feature['sID']) || self.features.create
        
        feature.each do |name, value|
          name = name.sub /^s/, '' unless name == 'sID'
          unit_feature.update_attribute name, value if unit_feature.respond_to? name
        end
      end
    end
  end
  
  def get_features
    [IssnAdapter.get_unit_features(self.listing.facility_id, self.sID)].flatten
  end
  
  def update_units
    IssnAdapter.update_models_from_issn :class => FacilityUnit,
                                        :data => self.get_unit_info, 
                                        :model => self.units,
                                        :find_method => 'find_by_UnitID',
                                        :find_attr => 'sUnitID'
  end
  
  # issn method: getFacilityUnits
  def get_unit_info
    @facility_units ||= [IssnAdapter.get_unit_info(self.listing.facility_id, self.sID)].flatten
  end
  
end
