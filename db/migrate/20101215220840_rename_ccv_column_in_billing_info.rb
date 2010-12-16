class RenameCcvColumnInBillingInfo < ActiveRecord::Migration
  def self.up
    rename_column :billing_infos, :ccv, :cvv
  end

  def self.down
    rename_column :billing_infos, :cvv, :ccv
  end
end
