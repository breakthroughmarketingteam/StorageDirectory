class AddColumnsToMailingAddresses < ActiveRecord::Migration
  def self.up
    add_column :mailing_addresses, :city, :string
    add_column :mailing_addresses, :state, :string
    add_column :mailing_addresses, :zip, :string
  end

  def self.down
    remove_column :mailing_addresses, :zip
    remove_column :mailing_addresses, :state
    remove_column :mailing_addresses, :city
  end
end
