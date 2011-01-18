class FacilityFeature < ActiveRecord::Base
  
  has_many :listing_features, :dependent => :destroy
  has_many :listings, :through => :listing_features
  access_shared_methods
  
end
