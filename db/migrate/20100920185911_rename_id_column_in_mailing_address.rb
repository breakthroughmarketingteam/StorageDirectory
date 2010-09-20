class RenameIdColumnInMailingAddress < ActiveRecord::Migration
  def self.up
    rename_column :mailing_addresses, :client_id, :user_id
  end

  def self.down
    rename_column :mailing_addresses, :user_id, :client_id
  end
end
