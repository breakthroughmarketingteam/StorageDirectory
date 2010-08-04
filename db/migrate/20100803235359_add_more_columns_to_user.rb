class AddMoreColumnsToUser < ActiveRecord::Migration
  def self.up
    add_column :users, :wants_newsletter, :boolean
    add_column :users, :activation_code, :string
  end

  def self.down
    remove_column :users, :activation_code
    remove_column :users, :wants_newsletter
  end
end
