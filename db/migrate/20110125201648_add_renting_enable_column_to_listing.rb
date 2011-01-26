class AddRentingEnableColumnToListing < ActiveRecord::Migration
  def self.up
    add_column :listings, :renting_enabled, :boolean
  end

  def self.down
    remove_column :listings, :renting_enabled
  end
end
