class AddUnitTypeIdToReservation < ActiveRecord::Migration
  def self.up
    add_column :reservations, :unit_type_id, :integer
  end

  def self.down
    remove_column :reservations, :unit_type_id
  end
end
