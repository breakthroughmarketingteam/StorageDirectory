class MakeBillingInfoPolymorphic < ActiveRecord::Migration
  def self.up
    remove_column :billing_infos, :client_id
    add_column :billing_infos, :billable_type, :string
    add_column :billing_infos, :billable_id, :integer
  end

  def self.down
    remove_column :billing_infos, :billable_type
    remove_column :billing_infos, :billable_id
    add_column :billing_infos, :client_id, :integer
  end
end
