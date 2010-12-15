class AddZipColumnsToBillingInfo < ActiveRecord::Migration
  def self.up
    add_column :billing_infos, :city, :string
    add_column :billing_infos, :state, :string
    add_column :billing_infos, :zip, :integer
  end

  def self.down
    remove_column :billing_infos, :zip
    remove_column :billing_infos, :state
    remove_column :billing_infos, :city
  end
end
