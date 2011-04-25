class AddShortUrlColumnTolisting < ActiveRecord::Migration
  def self.up
    add_column :listings, :short_url, :string
  end

  def self.down
    remove_column :listings, :short_url
  end
end
