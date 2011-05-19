class AddPositionColumnToUser < ActiveRecord::Migration
  def self.up
    add_column :users, :parent_id, :integer
    add_column :users, :left, :integer
    add_column :users, :right, :integer
  end

  def self.down
    remove_column :users, :right
    remove_column :users, :left
    remove_column :users, :parent_id
  end
end
