class AddFullStateColumnToListing2 < ActiveRecord::Migration
  def self.up
    add_column :listings, :full_state, :string rescue puts $!
    add_column :listings, :phone_views_count, :integer rescue puts $!
  end

  def self.down
    remove_column :listings, :phone_views_count rescue puts $!
    remove_column :listings, :full_state rescue puts $!
  end
end
