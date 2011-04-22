class ListingContact < ActiveRecord::Base
  
  belongs_to :listing
  access_shared_methods
  named_scope :not_unsub, :conditions => 'unsub IS NULL AND email IS NOT NULL'
  
end
