class AddAddressColumnToMailingAddress < ActiveRecord::Migration
  def self.up
    add_column :mailing_addresses, :address2, :string
    add_column :billing_infos, :address2, :string
  end

  def self.down
    remove_column :mailing_addresses, :address2
    remove_column :billing_infos, :address2
  end
end
