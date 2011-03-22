class CreateComparisons < ActiveRecord::Migration
  def self.up
    create_table :comparisons do |t|
      t.integer :listing_id
      t.integer :compare_id

      t.timestamps
    end
  end

  def self.down
    drop_table :comparisons
  end
end
