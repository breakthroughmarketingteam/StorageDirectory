class AddCalcColumnsToSpecial < ActiveRecord::Migration
  def self.up
    add_column :specials, :amount, :float
    add_column :specials, :function, :string
  end

  def self.down
    remove_column :specials, :function
    remove_column :specials, :amount
  end
end
