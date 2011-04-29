class ChangeBillingInfoColumnsToText < ActiveRecord::Migration
  def self.up
    remove_column :billing_infos, :card_number
    remove_column :billing_infos, :card_type
    remove_column :billing_infos, :cvv
    remove_column :billing_infos, :expires_month
    remove_column :billing_infos, :expires_year
    
    add_column :billing_infos, :card_number, :binary
    add_column :billing_infos, :card_type, :binary
    add_column :billing_infos, :cvv, :binary
    add_column :billing_infos, :expires_month, :binary
    add_column :billing_infos, :expires_year, :binary
  end

  def self.down
    
  end
end
