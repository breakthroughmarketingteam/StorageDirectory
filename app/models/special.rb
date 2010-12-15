class Special < ActiveRecord::Base
  
  belongs_to :client
  has_one :promo
  has_many :rentals
  
  def sort_class
    self.class.name
  end
  
end
