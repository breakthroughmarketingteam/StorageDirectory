class CreatePhoneViews < ActiveRecord::Migration
  def self.up
    create_table :phone_views do |t|
      t.integer :listing_id
      t.text :referrer
      t.text :request_uri
      t.string :remote_ip

      t.timestamps
    end
  end

  def self.down
    drop_table :phone_views
  end
end
