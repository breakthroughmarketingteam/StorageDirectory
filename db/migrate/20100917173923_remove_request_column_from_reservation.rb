class RemoveRequestColumnFromReservation < ActiveRecord::Migration
  def self.up
    remove_column :reservations, :request_uri
  end

  def self.down
    add_column :reservations, :request_uri, :string
  end
end
