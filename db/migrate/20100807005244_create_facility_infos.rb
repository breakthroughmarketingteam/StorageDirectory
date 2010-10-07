class CreateFacilityInfos < ActiveRecord::Migration
  def self.up
    create_table :facility_infos do |t|
      t.string :O_FacilityName
      t.string :O_FacilityId
      t.integer :O_ISSNID
      t.boolean :O_WebReservationsAllowed
      t.boolean :O_WebRentalsAllowed
      t.string :O_Address
      t.string :O_Address2
      t.string :O_City
      t.string :O_StateOrProvince
      t.integer :O_PostalCode
      t.float :O_IssnLongitude
      t.float :O_IssnLatitude
      t.boolean :O_AcceptVisa
      t.boolean :O_AcceptMC
      t.boolean :O_AcceptAmex
      t.boolean :O_AcceptDiscover
      t.integer :O_MaximumReserveAheadDays
      t.string :O_PMS
      t.integer :O_ReservationFee_Min
      t.integer :O_ReservationFee_Max
      t.integer :O_ReservationOverrideFee

      t.timestamps
    end
  end

  def self.down
    drop_table :facility_infos
  end
end
