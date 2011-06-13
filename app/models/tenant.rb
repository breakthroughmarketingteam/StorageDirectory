class Tenant < User
  
  has_many :rentals
  has_many :listings, :through => :rentals
  has_many :billing_infos, :as => :billable, :dependent => :destroy
  accepts_nested_attributes_for :billing_infos, :rentals
  access_shared_methods
  acts_as_gotobillable :merchant_id    => ::GTB_MERCHANT[:id], 
                       :merchant_pin   => ::GTB_MERCHANT[:pin], 
                       :ip_address     => ::SERVER_IP,
                       :debug          => (RAILS_ENV == 'development' ? '1' : '0')
  
  def initialize(params = {})
    super params
    self.role_id = Role.get_role_id 'tenant'
    self.status = 'unverified'
  end
  
  def billing_info
    self.billing_infos.last
  end
  
  def invoice
    self.billing_info.invoice
  end
  
  def rental
    self.rentals.last
  end
  
  def listing
    self.rental.listing
  end
  
  def city_and_state
    @city_and_state ||= [self.billing_info.city, self.billing_info.state]
  end
  
  def city_state_zip; "#{self.city_and_state[0]}, #{self.city_and_state[1]} #{self.zip}" end
  def full_address; "#{self.billing_info.address}#{ " #{self.billing_info.address2}" unless self.billing_info.address2.blank?}, #{self.city_state_zip}" end
  
  def next_to_last_rental
    @r ||= begin
      r = self.rentals
      r[r.size-1]
    end
  end
  
  def process_billing!
    if self.listing.issn_enabled?
      response = self.listing.process_new_tenant IssnAdapter.build_issn_tenant_args(self, self.billing_info, self.rental)
      
      if response['sErrorMessage'].blank? || response['sErrorMessage'] =~ /(Account Created)/i
        self.update_attribute :reserve_code, response['sReservationCode']
        self.update_attribute :response, response.to_query
      end
    else
      self.process_billing_info! self.billing_info, :billing_amount => self.rental.total, :occurence_type => '', :process_date => self.format_date(self.rental.move_in_date)
    end
    
    self.deliver_emails
  end
  
  # TODO: find out why i would get the following error when using the delay method outside of this method on an instance of rental
  # Rental#deliver_emails failed with ActionView::TemplateError: undefined method `minmax' for #<Array:0x2b5a1d9ee060>
  def deliver_emails
    Notifier.deliver_tenant_notification self # to the tenant
    Notifier.deliver_new_tenant_alert    self # to info@usselfstoragelocator.com
    Notifier.deliver_rental_notification self # to the facility
  end
  
  def merge_attr_if_diff!(params)
    
  end
  
end