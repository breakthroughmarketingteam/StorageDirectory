class DropStatusAndAddPublishedColumnToComment < ActiveRecord::Migration
  def self.up
    remove_column :comments, :status
    add_column :comments, :published, :boolean
  end

  def self.down
    add_column :comments, :status, :string
    remove_column :comments, :published
  end
end
