class AddColumnsToRental < ActiveRecord::Migration
  def self.up
    add_column :rentals, :total, :integer
  end

  def self.down
    remove_column :rentals, :total
  end
end
