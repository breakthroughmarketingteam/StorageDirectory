class IssnUnitTypeFeature < ActiveRecord::Base
  # For retrieving the standard set of features for any facility unit
  
  has_many :features
  
  @@unwanted_features = ['normal', 'lift', 'non storage', 'basement']
  def self.labels
    #self.all.reject { |f| @@unwanted_features.include? f.ShortDescription.downcase }.map(&:ShortDescription).sort || []
    ['24 Hour Access',
    'Automatic Payments',
    'Boxes & Packing Supplies',
    'Business Center',
    'Carts and Dollies',
    'Climate Controlled',
    'Deliveries Accepted',
    'Drive-up Access',
    'Electricity Available',
    'Extended Access Hours',
    'Move-in Truck w/Rental',
    'Humidity Controlled',
    'Keypad Access',
    'Military Discounts',
    'Online Bill Pay',
    'On-Site Manager',
    'Se Habla Español',
    'Secure Storage',
    'Security Cameras',
    'Self Service Kiosk',
    'Senior Discounts',
    'Truck Rental']
  end
  
  def self.update_from_issn
    args = {
      :data        => IssnAdapter.get_standard_info('getStdUnitTypeFeatures'),
      :model       => self,
      :find_method => 'find_by_ShortDescription',
      :find_attr   => 'sShortDescription'
    }
    IssnAdapter.update_models_from_issn args
  end
  
end
