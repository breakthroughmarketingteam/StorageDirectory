class CreateSizeIcons < ActiveRecord::Migration
  def self.up
    create_table :size_icons do |t|
      t.string :title
      t.text :description
      t.integer :width
      t.integer :length
      t.string :icon_size
      t.string :icon_file_name
      t.integer :icon_file_size
      t.string :icon_content_type

      t.timestamps
    end
  end

  def self.down
    drop_table :size_icons
  end
end
