class Tenant < User
  
  has_many :rentals
  has_many :listings, :through => :rentals
  has_many :billing_infos, :foreign_key => 'client_id', :dependent => :destroy
  accepts_nested_attributes_for :billing_infos, :rentals
  
  def initialize(params = {})
    super params
    self.role_id = Role.get_role_id 'tenant'
  end
  
  def billing_info
    self.billing_infos.last
  end
  
  def full_address
    self.billing_info.full_address
  end
  
  def name=(val)
    self.first_name = val.split(' ').first
    self.last_name = val.split(' ').last
  end
  
end