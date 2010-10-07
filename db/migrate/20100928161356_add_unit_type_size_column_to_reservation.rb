class AddUnitTypeSizeColumnToReservation < ActiveRecord::Migration
  def self.up
    add_column :reservations, :unit_type_size, :string
  end

  def self.down
    remove_column :reservations, :unit_type_size
  end
end
