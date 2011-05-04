class BillingInfo < ActiveRecord::Base
  belongs_to :client
  belongs_to :tenant, :foreign_key => 'client_id'
  access_shared_methods
  
  @@credit_cards = ['Visa', 'Amex', 'MasterCard', 'Discover']
  cattr_reader :credit_cards
  
  #encrypt_with_public_key [:card_number, :card_type, :cvv, :expires_month, :expires_year], :key_pair => File.join(RAILS_ROOT,'cert','keypair3.pem')
  
  def obscured_card_number
    cnum = self.card_number #.decrypt
    "**** **** **** #{cnum[cnum.size - 4, cnum.size]}" unless cnum.blank?
  end
  
  def full_address
    "#{address} #{city}, #{state} #{zip}"
  end
  
end
