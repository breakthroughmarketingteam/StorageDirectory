class MailingAddress < ActiveRecord::Base
  
  belongs_to :user
  access_shared_methods
  
end
