class UserStat < ActiveRecord::Base
  
  belongs_to :user
  access_shared_methods
  
end
