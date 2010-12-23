class RemoveEmailColumnFromMailingAddress < ActiveRecord::Migration
  def self.up
    remove_column :mailing_addresses, :email
  end

  def self.down
    add_column :mailing_addresses, :email, :string
  end
end
