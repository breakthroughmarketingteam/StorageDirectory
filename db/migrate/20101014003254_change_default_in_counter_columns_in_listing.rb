class ChangeDefaultInCounterColumnsInListing < ActiveRecord::Migration
  def self.up
    change_column :listings, :clicks_count, :integer, :default => 0
    change_column :listings, :reservations_count, :integer, :default => 0
    change_column :listings, :impressions_count, :integer, :default => 0
  end

  def self.down
  end
end
