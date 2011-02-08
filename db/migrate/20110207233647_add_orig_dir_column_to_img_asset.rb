class AddOrigDirColumnToImgAsset < ActiveRecord::Migration
  def self.up
    add_column :img_assets, :orig_dir, :string
  end

  def self.down
    remove_column :img_assets, :orig_dir
  end
end
