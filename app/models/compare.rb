class Compare < ActiveRecord::Base
  
  has_many :comparisons, :dependent => :destroy
  has_many :listings, :through => :comparisons
  
end
