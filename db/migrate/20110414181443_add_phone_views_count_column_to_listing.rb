class AddPhoneViewsCountColumnToListing < ActiveRecord::Migration
  def self.up
    add_column :listings, :phone_views_count, :integer
  end

  def self.down
    remove_column :listings, :phone_views_count
  end
end
