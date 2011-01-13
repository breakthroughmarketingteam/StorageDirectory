class UserStat < ActiveRecord::Base
  
  belongs_to :user
  access_shared_methods
  
  def self.create_from_request(user, request)
    stat = self.new
    stat.user_id = user.id
    stat.request_uri = request.request_uri
    stat.referrer = request.referrer
    stat.save
    stat
  end
  
end
