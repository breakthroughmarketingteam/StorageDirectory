class Unsub < ActiveRecord::Base
  
  belongs_to :subscriber, :polymorphic => true
  access_shared_methods
  
end
