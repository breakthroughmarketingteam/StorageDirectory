class CreateReserveCosts < ActiveRecord::Migration
  def self.up
    create_table :reserve_costs do |t|
      t.integer :unit_type_id
      t.integer :LastDayYMD
      t.float :FeeAmount
      t.string :Available
      t.string :ManagementSystem_TID
      t.integer :ManagementSystem_UID
      t.float :Tax
      t.float :ReservationFeeMax
      t.integer :DetailCount
      t.string :FeeIncludesTax
      t.float :ReservationFeeMin
      t.string :ManagementSystem_TypeDesc
      t.string :LastDayMDY
      t.string :ManagementSystem_UnitName
      t.string :FeeDescription

      t.timestamps
    end
  end

  def self.down
    drop_table :reserve_costs
  end
end
