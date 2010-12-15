class RemoveColumnDurationFromRental < ActiveRecord::Migration
  def self.up
    remove_column :rentals, :duration
    add_column :rentals, :duration, :integer
  end

  def self.down
  end
end
