class AddUnSubColumnToListingContact < ActiveRecord::Migration
  def self.up
    add_column :listing_contacts, :unsub, :boolean
    add_column :listing_contacts, :unsub_token, :string
    
    require 'digest'
    ListingContact.all(:conditions => 'email IS NOT NULL').each do |c|
      c.update_attribute :unsub_token, Digest::SHA1.hexdigest(c.email)
    end
  end

  def self.down
    remove_column :listing_contacts, :unsub_token
    remove_column :listing_contacts, :unsub
  end
end
