class AddAccessHoursColumnsToListing < ActiveRecord::Migration
  def self.up
    add_column :listings, :office_24_hours, :boolean
    add_column :listings, :access_24_hours, :boolean
  end

  def self.down
    remove_column :listings, :access_24_hours
    remove_column :listings, :office_24_hours
  end
end
