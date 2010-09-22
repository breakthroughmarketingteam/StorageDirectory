class AddConfirmationColumnToReservation < ActiveRecord::Migration
  def self.up
    add_column :reservations, :confirmation_code, :string
  end

  def self.down
    remove_column :reservations, :confirmation_code
  end
end
