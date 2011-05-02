class AddKeyColumnsToBillingInfo < ActiveRecord::Migration
  def self.up
    add_column :billing_infos, :card_type_key, :binary
    add_column :billing_infos, :card_number_key, :binary
    add_column :billing_infos, :cvv_key, :binary
    add_column :billing_infos, :expires_month_key, :binary
    add_column :billing_infos, :expires_year_key, :binary
    
    add_column :billing_infos, :card_type_iv, :binary
    add_column :billing_infos, :card_number_iv, :binary
    add_column :billing_infos, :cvv_iv, :binary
    add_column :billing_infos, :expires_month_iv, :binary
    add_column :billing_infos, :expires_year_iv, :binary
  end

  def self.down
    remove_column :billing_infos, :expires_year_key
    remove_column :billing_infos, :expires_month_key
    remove_column :billing_infos, :cvv_key
    remove_column :billing_infos, :card_number_key
    remove_column :billing_infos, :card_type_key
    
    remove_column :billing_infos, :expires_year_iv
    remove_column :billing_infos, :expires_month_iv
    remove_column :billing_infos, :cvv_iv
    remove_column :billing_infos, :card_number_iv
    remove_column :billing_infos, :card_type_iv
  end
end
