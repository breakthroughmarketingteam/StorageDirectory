class AddColumnsToMapAndListing < ActiveRecord::Migration
  def self.up
    add_column :listings, :phone, :string
    add_column :maps, :address2, :string
  end

  def self.down
    remove_column :listings, :phone
    remove_column :maps, :address2
  end
end
