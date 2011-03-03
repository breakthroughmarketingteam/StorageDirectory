class CreateClaimedListings < ActiveRecord::Migration
  def self.up
    create_table :claimed_listings do |t|
      t.integer :listing_id
      t.integer :client_id
      t.boolean :verified

      t.timestamps
    end
  end

  def self.down
    drop_table :claimed_listings
  end
end
