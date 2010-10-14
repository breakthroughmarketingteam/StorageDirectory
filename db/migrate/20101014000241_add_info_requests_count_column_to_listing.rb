class AddInfoRequestsCountColumnToListing < ActiveRecord::Migration
  def self.up
    add_column :listings, :info_requests_count, :integer, :default => 0
  end

  def self.down
    remove_column :listings, :info_requests_count
  end
end
