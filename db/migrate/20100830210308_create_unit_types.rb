class CreateUnitTypes < ActiveRecord::Migration
  def self.up
    create_table :unit_types do |t|
      t.integer :listing_id
      t.datetime :LastTimeUpdateTried
      t.string :ManagementSystemsId
      t.string :StorageSvrDescription
      t.text :CustomDescription
      t.string :sID
      t.float :RentalRate
      t.float :ReservationFeeMax
      t.string :StdUnitTypeSizesDescription
      t.string :ManagementSystemsDescription
      t.string :ReservationOverrideFee
      t.integer :StopAvailableToRentWhenBelow
      t.integer :ActualSQFT
      t.text :SpecialComments
      t.datetime :LastTimeUpdated
      t.integer :ActualWidth
      t.float :ReservationFeeMin
      t.boolean :InsuranceRequired
      t.string :StdUnitTypeSizesId
      t.integer :QuantityAtFacility
      t.string :QuantityAvailableToRent
      t.integer :ActualLength

      t.timestamps
    end
    
    add_index :unit_types, :listing_id
  end

  def self.down
    drop_table :unit_types
  end
end
