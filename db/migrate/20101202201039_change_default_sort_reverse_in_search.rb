class ChangeDefaultSortReverseInSearch < ActiveRecord::Migration
  def self.up
    remove_column :searches, :sort_reverse
    add_column :searches, :sort_reverse, :string, :default => '-'
  end

  def self.down
  end
end
