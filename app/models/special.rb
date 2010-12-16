class Special < ActiveRecord::Base
  
  belongs_to :listing, :touch => true
  has_one :promo
  has_many :rentals
  
  def sort_class
    self.class.name
  end
  
end
