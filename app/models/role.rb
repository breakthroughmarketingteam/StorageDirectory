class Role < ActiveRecord::Base
  
  has_many :users
  has_many :permissions, :dependent => :destroy
  
  named_scope :non_admin_roles, :conditions => 'title != "Admin"'
  
  access_shared_methods
  
  def self.get_role_id(title)
    Role.find_by_title(title).try :id
  end
  
  def self.tenant_role_id
    Role.find_by_title('tenant').id
  end
  
  def select_list_options
    self.map { |r| "#{r.id}-#{r.title}"}
  end
  
end