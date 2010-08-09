class Client < User

  has_many :listings, :foreign_key => 'user_id'
  has_many :mailing_addresses, :dependent => :destroy
  has_many :billing_infos, :dependent => :destroy
  accepts_nested_attributes_for :listings, :mailing_addresses, :billing_infos
  
  attr_accessor :first_name, :last_name
  
  def accepts_reservations?
    false
  end
  
  def active_mailing_address
    self.mailing_addresses.first
  end
  
  def active_billing_info
    self.billing_infos.first
  end
  
  def has_mailing_address?
    !active_mailing_address.nil?
  end
  
  def has_billing_info?
    !active_billing_info.nil?
  end
  
  def update_info(info)
    mailing_address = self.active_mailing_address || self.mailing_addresses.build
    billing_info = self.active_billing_info || self.billing_infos.build
    mailing_address.update_attributes(info[:mailing_address]) && billing_info.update_attributes(info[:billing_info])
  end
  
  def potential_listings
    Listing.find :all, :conditions => ['title LIKE ?', self.company]
  end
  
end