class ConvertBillingFieldsToBinary < ActiveRecord::Migration
  def self.up
    remove_index :billing_infos, :name => :index_billing_infos_on_client_id_and_name_and_card_expiration
    change_column :billing_infos, :card_number, :binary
    change_column :billing_infos, :card_type, :binary
    change_column :billing_infos, :cvv, :binary
    change_column :billing_infos, :expires_month, :binary
    change_column :billing_infos, :expires_year, :binary
  end

  def self.down
  end
end
