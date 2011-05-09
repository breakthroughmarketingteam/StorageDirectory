class ChangeBillingInfoFieldsToText < ActiveRecord::Migration
  def self.up
    remove_column :billing_infos, :card_number
    remove_column :billing_infos, :card_type
    remove_column :billing_infos, :cvv
    remove_column :billing_infos, :expires_month
    remove_column :billing_infos, :expires_year
    
    add_column :billing_infos, :card_number, :string
    add_column :billing_infos, :card_type, :string
    add_column :billing_infos, :cvv, :string
    add_column :billing_infos, :expires_month, :string
    add_column :billing_infos, :expires_year, :string
  end

  def self.down
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
end
