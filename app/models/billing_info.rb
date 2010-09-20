class BillingInfo < ActiveRecord::Base
  
  belongs_to :client
  belongs_to :reserver, :foreign_key => 'client_id'
  access_shared_methods
  
end
