class AddLimitColumnsToSpecial < ActiveRecord::Migration
  def self.up
    add_column :specials, :month_limit, :integer
  end

  def self.down
    remove_column :specials, :month_limit
  end
end
