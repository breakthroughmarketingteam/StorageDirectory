class RenameColumnInReservation < ActiveRecord::Migration
  def self.up
    rename_column :reservations, :unit_type_id, :size_id
  end

  def self.down
    rename_column :reservations, :size_id, :unit_type_id
  end
end
