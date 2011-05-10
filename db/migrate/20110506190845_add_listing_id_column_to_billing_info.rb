class AddListingIdColumnToBillingInfo < ActiveRecord::Migration
  def self.up
    add_column :billing_infos, :listing_id, :integer
  end

  def self.down
    remove_column :billing_infos, :listing_id
  end
end
