class RenameClientIdColumnInSpecialToListingId < ActiveRecord::Migration
  def self.up
    rename_column :specials, :client_id, :listing_id
  end

  def self.down
    rename_column :specials, :listing_id, :client_id
  end
end
