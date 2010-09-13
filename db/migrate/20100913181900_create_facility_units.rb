class CreateFacilityUnits < ActiveRecord::Migration
  def self.up
    create_table :facility_units do |t|
      t.integer :unit_type_id
      t.string :UnitID
      t.string :UnitName
      t.string :Available
      t.string :PromosAvailable

      t.timestamps
    end
  end

  def self.down
    drop_table :facility_units
  end
end
