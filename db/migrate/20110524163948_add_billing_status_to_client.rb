class AddBillingStatusToClient < ActiveRecord::Migration
  def self.up
    add_column :users, :billing_status, :string, :default => 'free'
  end

  def self.down
    remove_column :users, :billing_status
  end
end
