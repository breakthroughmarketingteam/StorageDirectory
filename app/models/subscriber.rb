class Subscriber < User
  
  #has_many :newsletters
  access_shared_methods
  
  def initialize(params = {})
    super params
    self.role_id = Role.get_role_id 'Subscriber'
    self.status  = 'unverified'
    self.type    = self.class.name
  end
  
end