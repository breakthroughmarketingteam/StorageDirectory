class BillingInfo < ActiveRecord::Base
  
  belongs_to :billable, :polymorphic => true
  belongs_to :listing, :touch => true
  has_many :invoices
  access_shared_methods
  acts_as_gotobillable
  
  @@credit_cards = ['Visa', 'Amex', 'MasterCard', 'Discover']
  @@encryptables = [:card_number, :card_type, :cvv, :expires_month, :expires_year]
  @@merchant_id  = '236977'
  @@merchant_pin = 'Qh3Q3jxVtaZg'
  cattr_reader :credit_cards, :pass, :merchant_id, :merchant_pin
  
  # TODO: decrypting gives me error: data larger than mod len, or padding check failed
  #@@pass = 'usssl2119'
  #encrypt_with_public_key @@encryptables, :key_pair => File.join(RAILS_ROOT,'cert','keypair5.pem')
  
  def obs_card_number
    cnum = read_attribute :card_number # the card_number is truncated to the last for on before_save in gotobillable
    last4 = cnum[cnum.size - 4, cnum.size]
    "#{self.card_type == 'Amex' ? '**** ***** *' : '**** **** **** '}#{last4}" unless last4.blank?
  end
 
  def full_address
    "#{address} #{city}, #{state} #{zip}"
  end
  
  def billing_amount
    self.listing.respond_to?(:billing_amount) ? self.billable.billing_amount : 0
  end
  
  def expires
    "#{self.expires_month}#{self.expires_year}"
  end
  
  def deliver_notifications(invoice, starting)
    if starting # billing info saved
      Notifier.deliver_billing_processed_alert self, invoice
      Notifier.deliver_billing_processed_notification self, invoice
    else # billing info destroyed
      Notifier.deliver_billing_removed_alert self, invoice
      Notifier.deliver_billing_removed_notification self, invoice
    end
  end
  
end