class AddListingsCountColumnToUser < ActiveRecord::Migration
  def self.up
    add_column :users, :listings_count, :integer, :default => 0
  end

  def self.down
    remove_column :users, :listings_count
  end
end
