class AddReferrerColumnToStatsTables < ActiveRecord::Migration
  def self.up
    add_column :reservations, :referrer, :string
    add_column :impressions, :referrer, :string
    add_column :clicks, :referrer, :string
  end

  def self.down
    remove_column :clicks, :referrer
    remove_column :impressions, :referrer
    remove_column :reservations, :referrer
  end
end
