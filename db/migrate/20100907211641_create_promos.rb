class CreatePromos < ActiveRecord::Migration
  def self.up
    create_table :promos do |t|
      t.integer :special_id
      t.text :Description
      t.string :sID
      t.string :UseAtCounter
      t.string :Code
      t.string :UseAtWeb
      t.string :UseAtKiosk
      t.datetime :LastTimeUpdated
      t.string :CouponCode

      t.timestamps
    end
  end

  def self.down
    drop_table :promos
  end
end
