class AddListingIdColumnToSpecial < ActiveRecord::Migration
  def self.up
    add_column :promos, :listing_id, :integer
  end

  def self.down
    remove_column :promos, :listing_id
  end
end
