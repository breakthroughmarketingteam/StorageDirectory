class AddSizesIdColumnToUnitType < ActiveRecord::Migration
  def self.up
    add_column :unit_types, :size_id, :integer
  end

  def self.down
    remove_column :unit_types, :size_id
  end
end
