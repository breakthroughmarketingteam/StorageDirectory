class RenameFileColumnsInImgAsset < ActiveRecord::Migration
  def self.up
    rename_column :img_assets, :img_file_name, :cdn_file_name
    rename_column :img_assets, :img_file_size, :cdn_file_size
    rename_column :img_assets, :img_content_type, :cdn_content_type
  end

  def self.down
  end
end
