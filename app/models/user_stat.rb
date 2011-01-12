class UserStat < ActiveRecord::Base
  
  belongs_to :user
  access_shared_methods
  
  def self.create_from_request(user, request)
    stat = self.new
    stat.user_id = user.id
    stat.save
    stat
  end
  
end
