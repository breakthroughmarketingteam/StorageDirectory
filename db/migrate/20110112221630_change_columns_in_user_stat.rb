class ChangeColumnsInUserStat < ActiveRecord::Migration
  def self.up
    add_column :user_stats, :browser_vars, :text
  end

  def self.down
    remove_column :user_stats, :browser_vars
  end
end
