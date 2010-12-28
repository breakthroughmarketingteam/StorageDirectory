class ConvertBillingFieldsToBinary < ActiveRecord::Migration
  def self.up
    remove_index :billing_infos, :name => :index_billing_infos_on_client_id_and_name_and_card_expiration

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
