class BillingInfo < ActiveRecord::Base
  require 'openssl'
  
  belongs_to :client
  belongs_to :tenant, :foreign_key => 'client_id'
  access_shared_methods
  
  @@credit_cards = ['Visa', 'Amex', 'MasterCard', 'Discover']
  cattr_reader :credit_cards
  
  def pbk(pem = "#{RAILS_ROOT}/cert/pb_sandwich3.pem")
    @pbk ||= OpenSSL::PKey::RSA.new File.read(pem)
  end
  
  def pvk(pem = "#{RAILS_ROOT}/cert/tuna_salad3.pem", pw = 'usssl2119')
    @pvk ||= OpenSSL::PKey::RSA.new File.read(pem), pw
  end
  
  def before_save
    self.card_number   = self.pbk.public_encrypt self.card_number   if self.card_number
    self.card_type     = self.pbk.public_encrypt self.card_type     if self.card_type
    self.cvv           = self.pbk.public_encrypt self.cvv           if self.cvv
    self.expires_month = self.pbk.public_encrypt self.expires_month if self.expires_month
    self.expires_year  = self.pbk.public_encrypt self.expires_year  if self.expires_year
  end
  
  def obscured_card_number
    "**** **** **** #{self.card_number[self.card_number.size - 4, self.card_number.size]}" unless self.card_number.blank?
  end
  
  def card_number
    s = read_attribute :card_number
    self.pvk.private_decrypt s rescue nil
  end
  
  def card_type
    s = read_attribute :card_type
    self.pvk.private_decrypt s rescue nil
  end
  
  def cvv
    s = read_attribute :cvv
    self.pvk.private_decrypt s rescue nil
  end
  
  def expires_month
    s = read_attribute :expires_month
    self.pvk.private_decrypt s rescue nil
  end
  
  def expires_year
    s = read_attribute :expires_year
    self.pvk.private_decrypt s rescue nil
  end
  
  def full_address
    "#{address} #{city}, #{state} #{zip}"
  end
  
end
