class RenameDateColumnsInReservation < ActiveRecord::Migration
  def self.up
    rename_column :reservations, :start_date, :move_in_date
    rename_column :reservations, :end_date, :move_out_date
  end

  def self.down
    rename_column :reservations, :move_in_date, :start_date
    rename_column :reservations, :move_out_date, :end_date
  end
end
