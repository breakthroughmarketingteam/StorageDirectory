class CreateImpressions < ActiveRecord::Migration
  def self.up
    create_table :impressions do |t|
      t.integer :listing_id

      t.timestamps
    end
  end

  def self.down
    drop_table :impressions
  end
end
