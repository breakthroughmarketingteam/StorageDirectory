class AddCategoryColumnToListing < ActiveRecord::Migration
  def self.up
    add_column :listings, :category, :string
  end

  def self.down
    remove_column :listings, :category
  end
end
