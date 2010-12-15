class AddNestedSetColumnsToSearch < ActiveRecord::Migration
  def self.up
    add_column :searches, :listing_id, :integer
    add_column :searches, :parent_id, :integer
    add_column :searches, :lft, :integer
    add_column :searches, :rgt, :integer
  end

  def self.down
    remove_column :searches, :rgt
    remove_column :searches, :lft
    remove_column :searches, :parent_id
    remove_column :searches, :listing_id
  end
end
