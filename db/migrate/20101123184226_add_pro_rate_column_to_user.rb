class AddProRateColumnToUser < ActiveRecord::Migration
  def self.up
    add_column :users, :pro_rated, :boolean
  end

  def self.down
    remove_column :users, :pro_rated
  end
end
