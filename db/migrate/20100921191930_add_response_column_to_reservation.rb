class AddResponseColumnToReservation < ActiveRecord::Migration
  def self.up
    add_column :reservations, :response, :text
  end

  def self.down
    remove_column :reservations, :response
  end
end
