class CreateIssnFacilityUnitFeatures < ActiveRecord::Migration
  def self.up
    create_table :issn_facility_unit_features do |t|
      t.integer :listing_id
      t.integer :unit_type_id
      t.string :sID
      t.text :StdUnitTypesFeaturesShortDescription
      t.string :KnowOfFee
      t.integer :Fee
      t.string :StdUnitTypesFeaturesId
      t.text :ErrorMessage

      t.timestamps
    end
  end

  def self.down
    drop_table :issn_facility_unit_features
  end
end
