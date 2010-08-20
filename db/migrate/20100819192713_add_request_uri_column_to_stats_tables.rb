class AddRequestUriColumnToStatsTables < ActiveRecord::Migration
  def self.up
    add_column :reservations, :request_uri, :string
    add_column :impressions, :request_uri, :string
    add_column :clicks, :request_uri, :string
  end

  def self.down
    remove_column :clicks, :request_uri
    remove_column :impressions, :request_uri
    remove_column :reservations, :request_uri
  end
end
