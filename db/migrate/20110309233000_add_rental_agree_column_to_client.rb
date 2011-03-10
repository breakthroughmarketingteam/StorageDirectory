class AddRentalAgreeColumnToClient < ActiveRecord::Migration
  def self.up
    add_column :users, :rental_agree, :boolean
  end

  def self.down
    remove_column :users, :rental_agree
  end
end
