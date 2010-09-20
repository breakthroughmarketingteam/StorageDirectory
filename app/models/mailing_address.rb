class MailingAddress < ActiveRecord::Base
  
  belongs_to :user
  access_shared_methods
  
  validates_numericality_of :zip
  validates_length_of :zip, :is => 5
  
end
