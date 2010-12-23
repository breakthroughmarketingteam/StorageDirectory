class ListingContact < ActiveRecord::Base
  
  belongs_to :listing
  access_shared_methods
  
  named_scope :not_unsub, :conditions => 'unsub IS NULL'
  
end
