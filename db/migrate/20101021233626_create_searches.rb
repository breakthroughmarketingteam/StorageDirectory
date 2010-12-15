class CreateSearches < ActiveRecord::Migration
  def self.up
    create_table :searches do |t|
      t.string :query
      t.string :unit_size
      t.string :storage_type
      t.string :features
      t.integer :within
      t.string :referrer
      t.string :remote_ip
      t.float :lat
      t.float :lng
      t.string :city
      t.string :state
      t.integer :zip

      t.timestamps
    end
  end

  def self.down
    drop_table :searches
  end
end
