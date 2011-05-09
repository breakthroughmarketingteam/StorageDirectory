class RemoveColumnsFromBillingInfo < ActiveRecord::Migration
  def self.up
    remove_column :billing_infos, :status
    remove_column :billing_infos, :response
  end

  def self.down
    add_column :billing_infos, :response, :text
    add_column :billing_infos, :status, :string
  end
end
