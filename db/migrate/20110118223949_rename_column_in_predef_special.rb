class RenameColumnInPredefSpecial < ActiveRecord::Migration
  def self.up
    remove_column :predef_special_assigns, :client_id
    add_column :predef_special_assigns, :listing_id, :integer
  end

  def self.down
    add_column :predef_special_assigns, :client_id, :integer
    remove_column :predef_special_assigns, :listing_id
  end
end
