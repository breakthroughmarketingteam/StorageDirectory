class UserHint < ActiveRecord::Base
  
  has_many :user_hint_placements
  has_many :users, :through => :user_hint_placements
  access_shared_methods
  
  def placement(user)
    self.user_hint_placements.find_by_user_id user.id
  end
  
end
