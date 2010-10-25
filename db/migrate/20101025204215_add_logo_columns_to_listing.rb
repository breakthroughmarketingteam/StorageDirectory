class AddLogoColumnsToListing < ActiveRecord::Migration
  def self.up
    add_column :listings, :logo_file_name, :string
    add_column :listings, :logo_file_size, :integer
    add_column :listings, :logo_content_type, :string
  end

  def self.down
    remove_column :listings, :logo_content_type
    remove_column :listings, :logo_file_size
    remove_column :listings, :logo_file_name
  end
end
