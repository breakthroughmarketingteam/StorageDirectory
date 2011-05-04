class BillingInfo < ActiveRecord::Base
  
  belongs_to :billable, :polymorphic => true
  access_shared_methods
  
  @@credit_cards = ['Visa', 'Amex', 'MasterCard', 'Discover']
  @@encryptables = [:card_number, :card_type, :cvv, :expires_month, :expires_year]
  @@pass = 'usssl2119'
  cattr_reader :credit_cards, :pass
  
  #encrypt_with_public_key @@encryptables, :key_pair => File.join(RAILS_ROOT,'cert','keypair5.pem')
  
  def obscured_card_number
    cnum = self.card_number#self.plain_card_number
    "**** **** **** #{cnum[cnum.size - 4, cnum.size]}" unless cnum.blank?
  end
  
  def plain_card_number
    #@plain_card_number ||= self.card_number.decrypt(self.class.pass)
  end
  
  def plain_card_type
    #@plain_card_type ||= self.card_type.decrypt(self.class.pass)
  end
  
  def plain_cvv
    #@plain_card_number ||= self.cvv.decrypt(self.class.pass)
  end
  
  def plain_expires_month
    #@plain_expires_month ||= self.expires_month.decrypt(self.class.pass)
  end
  
  def plain_expires_year
    #@plain_expires_year ||= self.expires_year.decrypt(self.class.pass)
  end
 
  def full_address
    "#{address} #{city}, #{state} #{zip}"
  end
  
end
