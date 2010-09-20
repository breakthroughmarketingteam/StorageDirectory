class Reserver < User
  
  def initialize(params = {})
    super params
    self.role_id = Role.get_role_id('tenant')
  end
  
end