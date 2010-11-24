class Rental < ActiveRecord::Base
  
  belongs_to :tenant
  belongs_to :listing
  belongs_to :size
  belongs_to :special
  
end
