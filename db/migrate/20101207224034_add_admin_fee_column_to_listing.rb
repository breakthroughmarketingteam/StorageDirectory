class AddAdminFeeColumnToListing < ActiveRecord::Migration
  def self.up
    add_column :listings, :admin_fee, :integer
    add_column :listings, :prorated, :boolean
    add_column :listings, :tax_rate, :integer
  end

  def self.down
    remove_column :listings, :admin_fee
    remove_column :listings, :prorated
    remove_column :listings, :tax_rate
  end
end
