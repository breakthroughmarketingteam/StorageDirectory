class ChangeColumnSortNumInSearch < ActiveRecord::Migration
  def self.up
    remove_column :searches, :sort_num
    add_column :searches, :sort_reverse, :string, :default => '+'
  end

  def self.down
    remove_column :searches, :sort_reverse
    add_column :searches, :sort_num, :integer, :default => 0
  end
end
