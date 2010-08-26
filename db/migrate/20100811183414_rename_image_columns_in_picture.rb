class RenameImageColumnsInPicture < ActiveRecord::Migration
  def self.up
    rename_column :pictures, :image_file_name, :facility_image_file_name
    rename_column :pictures, :image_file_size, :facility_image_file_size
    rename_column :pictures, :image_content_type, :facility_image_content_type
  end

  def self.down
    rename_column :pictures, :facility_image_file_name, :image_file_name
    rename_column :pictures, :facility_image_file_size, :image_file_size
    rename_column :pictures, :facility_image_content_type, :image_content_type
  end
end
