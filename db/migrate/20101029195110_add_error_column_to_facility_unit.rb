class AddErrorColumnToFacilityUnit < ActiveRecord::Migration
  def self.up
    add_column :facility_units, :ErrorMessage, :string
  end

  def self.down
    remove_column :facility_units, :ErrorMessage
  end
end
