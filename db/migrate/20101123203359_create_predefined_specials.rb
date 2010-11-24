class CreatePredefinedSpecials < ActiveRecord::Migration
  def self.up
    create_table :predefined_specials do |t|
      t.string :title
      t.text :description
      t.integer :value
      t.string :function
      t.integer :month_limit

      t.timestamps
    end
  end

  def self.down
    drop_table :predefined_specials
  end
end
