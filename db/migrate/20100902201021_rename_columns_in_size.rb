class RenameColumnsInSize < ActiveRecord::Migration
  def self.up
    rename_column :sizes, :x, :width
    rename_column :sizes, :y, :length
  end

  def self.down
    rename_column :sizes, :width, :x
    rename_column :sizes, :length, :y
  end
end
