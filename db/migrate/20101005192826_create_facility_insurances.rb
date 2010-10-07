class CreateFacilityInsurances < ActiveRecord::Migration
  def self.up
    create_table :facility_insurances do |t|
      t.integer :listing_id
      t.string :sID
      t.string :Provider
      t.string :TheftCoverage
      t.integer :MonthlyPremium
      t.integer :CoverageAmount

      t.timestamps
    end
  end

  def self.down
    drop_table :facility_insurances
  end
end
