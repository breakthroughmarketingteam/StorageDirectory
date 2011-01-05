class AddMetaColumnsToPage < ActiveRecord::Migration
  def self.up
    add_column :pages, :meta_desc, :text
  end

  def self.down
    remove_column :pages, :meta_desc
  end
end
