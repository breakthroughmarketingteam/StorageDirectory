class Promo < ActiveRecord::Base
  
  belongs_to :listing
  belongs_to :special
  
end
