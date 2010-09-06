class CreateFeatures < ActiveRecord::Migration
  def self.up
    create_table :features do |t|
      t.integer :unit_type_id
      t.string :ErrorMessage
      t.string :sID
      t.string :StdUnitTypesFeaturesShortDescription
      t.float :Fee
      t.string :KnowOfFee
      t.string :StdUnitTypesFeaturesId

      t.timestamps
    end
  end

  def self.down
    drop_table :features
  end
end
