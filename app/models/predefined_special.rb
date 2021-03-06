class PredefinedSpecial < ActiveRecord::Base
  
  has_many :predef_special_assigns, :dependent => :destroy
  has_many :clients, :through => :predef_special_assigns
  has_many :rentals, :as => :special, :foreign_key => 'special_id'
  access_shared_methods
  
  @@function_types = [['Percent Off', '%'], ['Dollars Off', '$'], ['Months Free', 'm']]
  cattr_reader :function_types
  
  def get_assign(id)
    self.predef_special_assigns.find_by_client_id id
  end
  
  def sort_class
    PredefSpecialAssign.name
  end
  
  def overall_value
    value * month_limit
  end
  
end
