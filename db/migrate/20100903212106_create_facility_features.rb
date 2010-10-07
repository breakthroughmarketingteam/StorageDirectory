class CreateFacilityFeatures < ActiveRecord::Migration
  def self.up
    create_table :facility_features do |t|
      t.integer :standard_id
      t.integer :listing_id
      t.string :title
      t.text :description

      t.timestamps
    end
  end

  def self.down
    drop_table :facility_features
  end
end
