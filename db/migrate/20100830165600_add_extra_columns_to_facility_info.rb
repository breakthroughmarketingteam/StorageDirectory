class AddExtraColumnsToFacilityInfo < ActiveRecord::Migration
  def self.up
    add_column :facility_infos, :UsersFacilityExternalID, :string
    add_column :facility_infos, :MS_Name, :string
    add_column :facility_infos, :MS_Phone, :string
    add_column :facility_infos, :MS_Description, :text
    add_column :facility_infos, :MS_Fax, :string
    add_column :facility_infos, :MS_Address1, :string
    add_column :facility_infos, :MS_State, :string
    add_column :facility_infos, :MS_Address2, :string
    add_column :facility_infos, :MS_Postal, :integer
    add_column :facility_infos, :MS_City, :string
    add_column :facility_infos, :MS_WebSite, :string
  end

  def self.down
    remove_column :facility_infos, :MS_WebSite
    remove_column :facility_infos, :MS_City
    remove_column :facility_infos, :MS_Postal
    remove_column :facility_infos, :MS_Address2
    remove_column :facility_infos, :MS_State
    remove_column :facility_infos, :MS_Address1
    remove_column :facility_infos, :MS_Fax
    remove_column :facility_infos, :MS_Description
    remove_column :facility_infos, :MS_Phone
    remove_column :facility_infos, :MS_Name
    remove_column :facility_infos, :UsersFacilityExternalID
  end
end
