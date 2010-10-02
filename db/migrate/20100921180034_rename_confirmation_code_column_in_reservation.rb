class RenameConfirmationCodeColumnInReservation < ActiveRecord::Migration
  def self.up
    rename_column :reservations, :confirmation_code, :reserve_code
  end

  def self.down
    rename_column :reservations, :reserve_code, :confirmation_code
  end
end
