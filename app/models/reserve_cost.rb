class ReserveCost < ActiveRecord::Base
  
  belongs_to :unit_type
  
  def total_cost
    self.FeeAmount * self.Tax + self.FeeAmount rescue self.FeeAmount
  end
  
end
