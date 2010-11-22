class CreateRentals < ActiveRecord::Migration
  def self.up
    create_table :rentals do |t|
      t.integer :tenant_id
      t.integer :listing_id
      t.integer :size_id
      t.integer :special_id
      t.datetime :move_in_date
      t.string :duration

      t.timestamps
    end
  end

  def self.down
    drop_table :rentals
  end
end
