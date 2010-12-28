class BillingInfo < ActiveRecord::Base
  require 'openssl'
  
  belongs_to :client
  belongs_to :tenant, :foreign_key => 'client_id'
  access_shared_methods
  
  @@credit_cards = ['Visa', 'Amex', 'MasterCard', 'Discover']
  cattr_reader :credit_cards
  
  def pb_sandwich
    @pbk ||= OpenSSL::PKey::RSA.new File.read("#{RAILS_ROOT}/cert/pb_sandwich.pem")
  end
  
  def tuna_salad
    @pvk ||= OpenSSL::PKey::RSA.new File.read("#{RAILS_ROOT}/cert/tuna_salad.pem"), 'usssl2119'
  end
  
  def before_save
    self.card_number   = pb_sandwich.public_encrypt(self.card_number)
    self.card_type     = pb_sandwich.public_encrypt(self.card_type)
    self.cvv           = pb_sandwich.public_encrypt(self.cvv)
    self.expires_month = pb_sandwich.public_encrypt(self.expires_month)
    self.expires_year  = pb_sandwich.public_encrypt(self.expires_year)
  end
  
  def obscured_card_number
    "**** **** **** #{self.card_number[self.card_number.size - 4, self.card_number.size]}" unless self.card_number.blank?
  end
  
  def card_number
    tuna_salad.private_decrypt read_attribute(:card_number)
  rescue
    read_attribute :card_number
  end
  
  def card_type
    tuna_salad.private_decrypt read_attribute(:card_type)
  rescue
    read_attribute :card_type
  end
  
  def cvv
    tuna_salad.private_decrypt read_attribute(:cvv)
  rescue
    read_attribute :cvv
  end
  
  def expires_month
    tuna_salad.private_decrypt read_attribute(:expires_month)
  rescue
    read_attribute :expires_month
  end
  
  def expires_year
    tuna_salad.private_decrypt read_attribute(:expires_year)
  rescue
    read_attribute :expires_year
  end
  
  def full_address
    "#{address} #{city}, #{state} #{zip}"
  end
end
