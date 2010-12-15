class AddEmailColumnToListingContact < ActiveRecord::Migration
  def self.up
    add_column :listing_contacts, :email, :string
  end

  def self.down
    remove_column :listing_contacts, :email
  end
end
