class RenameColumnInSizes < ActiveRecord::Migration
  def self.up
    rename_column :sizes, :unit_type, :description
  end

  def self.down
    rename_column :sizes, :description, :unit_type
  end
end
