class BillingInfo < ActiveRecord::Base
  
  belongs_to :client
  belongs_to :tenant, :foreign_key => 'client_id'
  access_shared_methods
  
  @@credit_cards = ['Visa', 'Amex', 'MasterCard', 'Discover']
  cattr_reader :credit_cards
  
  def obscured_card_number
    "**** **** **** #{self.card_number[self.card_number.size - 4, self.card_number.size]}" unless self.card_number.blank?
  end
  
  def full_address
    "#{address} #{city}, #{state} #{zip}"
  end
  
end
