class ChangeColumnInComment < ActiveRecord::Migration
  def self.up
    remove_column :comments, :comment
    add_column :comments, :comment, :text
  end

  def self.down
    remove_column :comments, :comment
    add_column :comments, :comment, :text
  end
end
