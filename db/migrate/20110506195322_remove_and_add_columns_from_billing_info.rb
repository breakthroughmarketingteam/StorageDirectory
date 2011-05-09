class RemoveAndAddColumnsFromBillingInfo < ActiveRecord::Migration
  def self.up
    add_column :billing_infos, :response, :text
    add_column :billing_infos, :status, :string
    
    remove_columns :billing_infos, :card_type_key
    remove_columns :billing_infos, :card_type_iv
    remove_columns :billing_infos, :card_number_key
    remove_columns :billing_infos, :card_number_iv
    remove_columns :billing_infos, :cvv_key
    remove_columns :billing_infos, :cvv_iv
    remove_columns :billing_infos, :expires_month_key
    remove_columns :billing_infos, :expires_month_iv
    remove_columns :billing_infos, :expires_year_key
    remove_columns :billing_infos, :expires_year_iv
  end

  def self.down
    remove_column :billing_infos, :status
    remove_column :billing_infos, :response
  end
end
