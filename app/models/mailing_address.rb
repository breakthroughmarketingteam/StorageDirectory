class MailingAddress < ActiveRecord::Base
  
  belongs_to :client
  belongs_to :user, :foreign_key => 'client_id'
  access_shared_methods
  
end
