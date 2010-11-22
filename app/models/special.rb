class Special < ActiveRecord::Base
  
  belongs_to :listing
  has_one :promo
  has_many :rentals
  
end
