class Note < ActiveRecord::Base
  
  belongs_to :client, :foreign_key => :user_id
  belongs_to :user, :foreign_key => :created_by
  access_shared_methods
  
  def title
    "Note for #{self.client.name}"
  end
  
end
