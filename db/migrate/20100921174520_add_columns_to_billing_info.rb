class AddColumnsToBillingInfo < ActiveRecord::Migration
  def self.up
    add_column :billing_infos, :ccv, :integer
    rename_column :billing_infos, :card_expiration, :expires_month
    add_column :billing_infos, :expires_year, :integer
  end

  def self.down
    remove_column :billing_infos, :ccv
    rename_column :billing_infos, :expires_month, :card_expiration
    remove_column :billing_infos, :expires_year
  end
end
