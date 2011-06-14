class BillingInfo < ActiveRecord::Base
  
  belongs_to :billable, :polymorphic => true
  belongs_to :listing
  has_many :invoices
  access_shared_methods
  
  @@credit_cards = ['Visa', 'Amex', 'MasterCard', 'Discover']
  @@encryptables = [:card_number, :card_type, :cvv, :expires_month, :expires_year]
  cattr_reader :credit_cards, :pass, :merchant_id, :merchant_pin
  
  def before_save
    self.name = billable.name if self.name.blank?
  end
  
  def before_destroy
    (self.listing ? self.listing.client : self.billable).cancel_billing
  end
  
  def obs_card_number
    cnum = read_attribute :card_number # the card_number is truncated to the last for on before_save in gotobillable
    return '' if cnum.blank?
    last4 = cnum[cnum.size - 4, cnum.size]
    "#{self.card_type == 'Amex' ? '**** ***** *' : '**** **** **** '}#{last4}" unless last4.blank?
  end
 
  def full_address
    @full_address ||= "#{address} #{city}, #{state} #{zip}"
  end
  
  def invoice_id
    "#{self.listing ? "L-#{self.listing.id}" : "C-#{self.billable.id}"}-#{self.updated_at.to_i}"
  end
  
  def invoice
    self.invoices.last
  end
  
  def expires
    "#{self.expires_month}#{self.expires_year}"
  end
  
end