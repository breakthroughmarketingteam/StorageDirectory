class AddPositionColumnToPost < ActiveRecord::Migration
  def self.up
    add_column :posts, :position, :integer, :default => 0
  end

  def self.down
    remove_column :posts, :position
  end
end
