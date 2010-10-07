class Reserver < User
  
  has_many :reservations
  has_many :billing_infos, :foreign_key => 'client_id', :dependent => :destroy
  accepts_nested_attributes_for :billing_infos
  
  def initialize(params = {})
    super params
    self.role_id = Role.get_role_id 'tenant'
  end
  
  def billing_info
    self.billing_infos.first
  end
  
end