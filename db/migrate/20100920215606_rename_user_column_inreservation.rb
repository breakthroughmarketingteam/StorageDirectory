class RenameUserColumnInreservation < ActiveRecord::Migration
  def self.up
    rename_column  :reservations, :user_id, :reserver_id
  end

  def self.down
    rename_column  :reservations, :reserver_id, :user_id
  end
end
