class AddPaidThruColumnToRental < ActiveRecord::Migration
  def self.up
    add_column :rentals, :paid_thru, :datetime
  end

  def self.down
    remove_column :rentals, :paid_thru
  end
end
