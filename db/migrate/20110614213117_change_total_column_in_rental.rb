class ChangeTotalColumnInRental < ActiveRecord::Migration
  def self.up
    change_column :rentals, :total, :float
  end

  def self.down
    change_column :rentals, :total, :integer
  end
end
