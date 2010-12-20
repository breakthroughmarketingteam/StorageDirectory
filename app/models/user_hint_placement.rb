class UserHintPlacement < ActiveRecord::Base
  
  belongs_to :user
  belongs_to :user_hint
  
end
