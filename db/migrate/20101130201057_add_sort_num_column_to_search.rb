class AddSortNumColumnToSearch < ActiveRecord::Migration
  def self.up
    add_column :searches, :sort_num, :integer, :default => 0
  end

  def self.down
    remove_column :searches, :sort_num
  end
end
