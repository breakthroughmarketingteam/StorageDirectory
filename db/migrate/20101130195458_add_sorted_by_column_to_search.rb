class AddSortedByColumnToSearch < ActiveRecord::Migration
  def self.up
    add_column :searches, :sorted_by, :string
  end

  def self.down
    remove_column :searches, :sorted_by
  end
end
