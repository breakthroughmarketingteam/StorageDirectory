class AddMoreColumnsToRental < ActiveRecord::Migration
  def self.up
    add_column :rentals, :tax_amt, :float
    add_column :rentals, :subtotal, :float
  end

  def self.down
    remove_column :rentals, :sub_total
    remove_column :rentals, :tax
  end
end
