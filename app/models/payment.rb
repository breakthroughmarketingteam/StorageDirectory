class Payment < ActiveRecord::Base
  
  belongs_to :client, :foreign_key => 'user_id'
  access_shared_methods
  
  cattr_reader :transaction_types, :card_types
  @@transaction_types = [
    ['Authorize Only', 'AS'],
    ['Capture Only', 'DS'],
    ['Authorize & Capture', 'ES'],
    ['Credit/Refund', 'CR'],
    ['Void', 'VO'],
    ['Delete Pending', 'RM'],
  ]
  
  @@card_types = [
    ['Visa', 'VS'],
    ['Amex', 'AX'],
    ['Master Card', 'MC'],
    ['Discover', 'DC']
  ]
  
end
