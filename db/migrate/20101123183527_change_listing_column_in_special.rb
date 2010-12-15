class ChangeListingColumnInSpecial < ActiveRecord::Migration
  def self.up
    rename_column :specials, :listing_id, :client_id
    Special.find_each do |s|
      l = Listing.find s.client_id
      s.update_attribute :client_id, l.client.id
    end
  end

  def self.down
    rename_column :specials, :client_id, :listing_id
  end
end
