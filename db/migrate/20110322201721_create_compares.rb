class CreateCompares < ActiveRecord::Migration
  def self.up
    create_table :compares do |t|
      t.datetime :created_at
      t.datetime :updated_at
      t.text :referrer
      t.string :request_uri
      t.string :remote_ip

      t.timestamps
    end
  end

  def self.down
    drop_table :compares
  end
end
