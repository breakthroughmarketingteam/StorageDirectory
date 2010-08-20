class AddCounterColumnsToListing < ActiveRecord::Migration
  def self.up
    add_column :listings, :clicks_count, :integer, :default => 0
    add_column :listings, :impressions_count, :integer, :default => 0
    add_column :listings, :reservations_count, :integer, :default => 0
  end

  def self.down
    remove_column :listings, :reservations_count
    remove_column :listings, :impressions_count
    remove_column :listings, :clicks_count
  end
end
