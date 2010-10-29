class AddHashColumnToAccountSetting < ActiveRecord::Migration
  def self.up
    add_column :account_settings, :virtuabutes, :text
  end

  def self.down
    remove_column :account_settings, :virtuabutes
  end
end
