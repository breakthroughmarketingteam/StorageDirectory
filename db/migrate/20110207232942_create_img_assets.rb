class CreateImgAssets < ActiveRecord::Migration
  def self.up
    create_table :img_assets do |t|
      t.string :title
      t.text :original
      t.string :img_file_name
      t.integer :img_file_size
      t.string :img_content_type

      t.timestamps
    end
  end

  def self.down
    drop_table :img_assets
  end
end
