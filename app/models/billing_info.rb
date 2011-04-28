class BillingInfo < ActiveRecord::Base
  require 'openssl'
  require 'base64'
  
  belongs_to :client
  belongs_to :tenant, :foreign_key => 'client_id'
  access_shared_methods
  
  @@credit_cards = ['Visa', 'Amex', 'MasterCard', 'Discover']
  cattr_reader :credit_cards
  
  @@pbk ||= OpenSSL::PKey::RSA.new File.read("#{RAILS_ROOT}/cert/pb_sandwich.pem")
  @@pvk ||= OpenSSL::PKey::RSA.new File.read("#{RAILS_ROOT}/cert/tuna_salad.pem"), 'usssl2119'
  
  def before_save
    self.card_number   = Base64.encode64 @@pbk.public_encrypt(self.card_number)   if self.card_number
    self.card_type     = Base64.encode64 @@pbk.public_encrypt(self.card_type)     if self.card_type
    self.cvv           = Base64.encode64 @@pbk.public_encrypt(self.cvv)           if self.cvv
    self.expires_month = Base64.encode64 @@pbk.public_encrypt(self.expires_month) if self.expires_month
    self.expires_year  = Base64.encode64 @@pbk.public_encrypt(self.expires_year)  if self.expires_year
  end
  
  def obscured_card_number
    "**** **** **** #{self.card_number[self.card_number.size - 4, self.card_number.size]}" unless self.card_number.blank?
  end
  
  def card_number
    s = read_attribute :card_number
    @@pvk.private_decrypt Base64.decode64(s) if s
  end
  
  def card_type
    s = read_attribute :card_type
    @@pvk.private_decrypt Base64.decode64(s) if s rescue nil
  end
  
  def cvv
    s = read_attribute :cvv
    @@pvk.private_decrypt Base64.decode64(s) if s rescue nil
  end
  
  def expires_month
    s = read_attribute :expires_month
    @@pvk.private_decrypt Base64.decode64(s) if s rescue nil
  end
  
  def expires_year
    s = read_attribute :expires_year
    @@pvk.private_decrypt Base64.decode64(s) if s rescue nil
  end
  
  def full_address
    "#{address} #{city}, #{state} #{zip}"
  end
end
