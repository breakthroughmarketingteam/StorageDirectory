class ChangeAdminFeeColumnInListing < ActiveRecord::Migration
  def self.up
    change_column :listings, :admin_fee, :float
  end

  def self.down
    change_column :listings, :admin_fee, :integer
  end
end
