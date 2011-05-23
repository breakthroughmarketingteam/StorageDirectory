class AddCustCodeColumnToUser < ActiveRecord::Migration
  def self.up
    add_column :listings, :cs_cust_code, :string
  end

  def self.down
    remove_column :listings, :cs_cust_code
  end
end
