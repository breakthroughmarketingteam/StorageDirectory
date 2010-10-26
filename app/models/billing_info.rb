class BillingInfo < ActiveRecord::Base
  
  belongs_to :client
  belongs_to :reserver, :foreign_key => 'client_id'
  access_shared_methods
  
  def obscured_card_number
    "**** **** **** #{self.card_number[self.card_number.size - 4, self.card_number.size]}" if self.card_number
  end
  
end
