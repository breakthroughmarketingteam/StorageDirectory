class ChangeBillingInfoColumnsToText < ActiveRecord::Migration
  def self.up
    change_column :billing_infos, :card_number, :text
    change_column :billing_infos, :card_type, :text
    change_column :billing_infos, :cvv, :text
    change_column :billing_infos, :expires_month, :text
    change_column :billing_infos, :expires_year, :text
  end

  def self.down
    change_column :billing_infos, :card_number, :binary
    change_column :billing_infos, :card_type, :binary
    change_column :billing_infos, :cvv, :binary
    change_column :billing_infos, :expires_month, :binary
    change_column :billing_infos, :expires_year, :binary
  end
end
