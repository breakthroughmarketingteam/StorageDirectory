class ChangeScopeColumnInPermission < ActiveRecord::Migration
  def self.up
    rename_column :permissions, :scope, :scoped
    change_column :permissions, :scoped, :boolean
  end

  def self.down
    change_column :permissions, :scoped, :boolean
    rename_column :permissions, :scoped, :scope
  end
end
