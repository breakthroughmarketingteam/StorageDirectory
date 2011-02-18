class AddConfNumColumnsToRental < ActiveRecord::Migration
  def self.up
    add_column :rentals, :conf_num, :string
  end

  def self.down
    remove_column :rentals, :conf_num
  end
end
