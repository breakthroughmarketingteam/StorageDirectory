class Tenant < User
  
  has_many :rentals
  has_many :listings, :through => :rentals
  has_many :billing_infos, :as => :billable, :dependent => :destroy
  accepts_nested_attributes_for :billing_infos, :rentals
  
  def initialize(params = {})
    super params
    self.role_id = Role.get_role_id 'tenant'
    self.status = 'unverified'
  end
  
  def billing_info
    self.billing_infos.last
  end
  
  def city_and_state
    @city_and_state ||= [self.billing_info.city, self.billing_info.state]
  end
  
  def city_state_zip; "#{self.city_and_state[0]}, #{self.city_and_state[1]} #{self.zip}" end
  def full_address; "#{self.billing_info.address}#{ " #{self.billing_info.address2}" unless self.billing_info.address2.blank?}, #{self.city_state_zip}" end
  
  def name
    "#{self.first_name} #{self.last_name}"
  end
  
  def name=(val)
    self.first_name = val.split(' ').first
    self.last_name = val.split(' ').last
  end
  
  def next_to_last_rental
    @r ||= begin
      r = self.rentals
      r[r.size-1]
    end
  end
  
  def merge_attr_if_diff!(params)
    
  end
  
end