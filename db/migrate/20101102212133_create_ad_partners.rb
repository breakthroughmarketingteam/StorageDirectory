class CreateAdPartners < ActiveRecord::Migration
  def self.up
    create_table :ad_partners do |t|
      t.string :title
      t.text :description
      t.string :url
      t.string :html_attributes
      t.string :image_file_name
      t.integer :image_file_size
      t.string :image_content_type

      t.timestamps
    end
  end

  def self.down
    drop_table :ad_partners
  end
end
