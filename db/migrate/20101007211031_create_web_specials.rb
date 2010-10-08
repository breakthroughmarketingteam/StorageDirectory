class CreateWebSpecials < ActiveRecord::Migration
  def self.up
    create_table :web_specials do |t|
      t.string :label
      t.string :title
      t.text :description
      t.string :coupon_code
      t.integer :value
      t.string :function
      t.integer :listing_id

      t.timestamps
    end
  end

  def self.down
    drop_table :web_specials
  end
end
