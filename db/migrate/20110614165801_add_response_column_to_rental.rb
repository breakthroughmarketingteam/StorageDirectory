class AddResponseColumnToRental < ActiveRecord::Migration
  def self.up
    add_column :rentals, :response, :text
  end

  def self.down
    remove_column :rentals, :response
  end
end
