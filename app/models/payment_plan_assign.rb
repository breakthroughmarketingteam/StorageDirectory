class PaymentPlanAssign < ActiveRecord::Base
  
  belongs_to :client
  belongs_to :payment_plan
  
end
