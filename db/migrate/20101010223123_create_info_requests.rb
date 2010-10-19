class CreateInfoRequests < ActiveRecord::Migration
  def self.up
    create_table :info_requests do |t|
      t.integer :listing_id
      t.string :name
      t.string :email
      t.string :phone
      t.string :duration
      t.string :unit_type_size
      t.string :status
      t.datetime :move_in_date

      t.timestamps
    end
  end

  def self.down
    drop_table :info_requests
  end
end
