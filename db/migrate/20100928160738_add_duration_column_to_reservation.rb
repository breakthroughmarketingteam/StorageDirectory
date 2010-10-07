class AddDurationColumnToReservation < ActiveRecord::Migration
  def self.up
    add_column :reservations, :duration, :string
  end

  def self.down
    remove_column :reservations, :duration
  end
end
