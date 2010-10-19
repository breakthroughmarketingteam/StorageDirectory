class AddColumnsToAccountSettings < ActiveRecord::Migration
  def self.up
    add_column :account_settings, :reports_recipients, :text
    remove_column :account_settings, :settings_hash
  end

  def self.down
    remove_column :account_settings, :reports_recipients
    add_column :account_settings, :settings_hash, :text
  end
end
