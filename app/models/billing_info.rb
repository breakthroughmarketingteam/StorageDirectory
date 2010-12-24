class BillingInfo < ActiveRecord::Base
  require 'openssl'
  require 'base64'
  
  @@pkey_file = "#{RAILS_ROOT}/cert/pb_sandwich.pem"
  @@pkey = OpenSSL::PKey::RSA.new File.read(@@pkey_file), 'usssl2119'
  
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
  
  def pb_sandwich # encrypt
    @k ||= OpenSSL::PKey::RSA.new File.read("#{RAILS_ROOT}/cert/pb_sandwich.pem")
  end
  
  def tuna_salad #decrypt
    "#{RAILS_ROOT}/cert/tuna_salad.pem"
    @k ||= OpenSSL::PKey::RSA.new File.read("#{RAILS_ROOT}/cert/tuna_salad.pem"), 'usssl2119'
  end
  
  def before_save
    raise self.pretty_inspect
    self.card_number   = Base64.encode64 @@pkey.public_encrypt(self.card_number)
    self.card_type     = Base64.encode64 @@pkey.public_encrypt(self.card_type)
    self.cvv           = Base64.encode64 @@pkey.public_encrypt(self.cvv)
    self.expires_month = Base64.encode64 @@pkey.public_encrypt(self.expires_month)
    self.expires_year  = Base64.encode64 @@pkey.public_encrypt(self.expires_year)
  end
  
  def card_number
    @@pkey.private_decrypt Base64.decode64(read_attribute :card_number)
  rescue
    read_attribute :card_type
  end
  
  def card_type
    @@pkey.private_decrypt Base64.decode64(read_attribute :card_type)
  rescue
    read_attribute :card_type
  end
  
  def cvv
    @@pkey.private_decrypt Base64.decode64(read_attribute :cvv)
  rescue
    read_attribute :card_type
  end
  
  def expires_month
    @@pkey.private_decrypt Base64.decode64(read_attribute :expires_month)
  rescue
    read_attribute :card_type
  end
  
  def expires_year
    @@pkey.private_decrypt Base64.decode64(read_attribute :expires_year)
  rescue
    read_attribute :card_type
  end
end
