class AddSavingsColumnToRental < ActiveRecord::Migration
  def self.up
    add_column :rentals, :savings, :float
  end

  def self.down
    remove_column :rentals, :savings
  end
end
