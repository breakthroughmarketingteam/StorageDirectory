class CreateAccountSettings < ActiveRecord::Migration
  def self.up
    create_table :account_settings do |t|
      t.integer :client_id
      t.text :settings_hash

      t.timestamps
    end
  end

  def self.down
    drop_table :account_settings
  end
end
