class AddDefaultLogoColumnToListing < ActiveRecord::Migration
  def self.up
    add_column :listings, :default_logo, :integer
  end

  def self.down
    remove_column :listings, :default_logo
  end
end
