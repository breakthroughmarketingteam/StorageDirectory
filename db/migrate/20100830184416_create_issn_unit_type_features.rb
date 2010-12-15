class CreateIssnUnitTypeFeatures < ActiveRecord::Migration
  def self.up
    create_table :issn_unit_type_features do |t|
      t.string :MappingCodes
      t.string :sID
      t.string :Abbreviation
      t.text :LongDescription
      t.string :ShortDescription

      t.timestamps
    end
  end

  def self.down
    drop_table :issn_unit_type_features
  end
end
