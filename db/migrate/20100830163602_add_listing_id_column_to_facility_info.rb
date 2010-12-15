class AddListingIdColumnToFacilityInfo < ActiveRecord::Migration
  def self.up
    add_column :facility_infos, :listing_id, :integer
  end

  def self.down
    remove_column :facility_infos, :listing_id
  end
end
