class UserStat < ActiveRecord::Base
  
  belongs_to :user
  access_shared_methods
  
  def self.create_from_request(user, request)
    self.user_id = user.id
  end
  
end
