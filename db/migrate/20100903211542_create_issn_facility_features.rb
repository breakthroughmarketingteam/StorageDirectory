class CreateIssnFacilityFeatures < ActiveRecord::Migration
  def self.up
    create_table :issn_facility_features do |t|
      t.string :MappingCodes
      t.string :sID
      t.text :LongDescription
      t.string :ShortDescription

      t.timestamps
    end
  end

  def self.down
    drop_table :issn_facility_features
  end
end
