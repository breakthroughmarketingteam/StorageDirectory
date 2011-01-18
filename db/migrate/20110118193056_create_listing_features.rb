class CreateListingFeatures < ActiveRecord::Migration
  def self.up
    create_table :listing_features do |t|
      t.integer :listing_id
      t.integer :facility_feature_id
      t.integer :position, :default => 0

      t.timestamps
    end
  end

  def self.down
    drop_table :listing_features
  end
end
