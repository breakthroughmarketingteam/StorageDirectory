class PredefSpecialAssign < ActiveRecord::Base
  
  belongs_to :predefined_special
  belongs_to :client
  
end
