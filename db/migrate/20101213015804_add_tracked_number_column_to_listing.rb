class AddTrackedNumberColumnToListing < ActiveRecord::Migration
  def self.up
    add_column :listings, :tracked_number, :string
  end

  def self.down
    remove_column :listings, :tracked_number
  end
end
