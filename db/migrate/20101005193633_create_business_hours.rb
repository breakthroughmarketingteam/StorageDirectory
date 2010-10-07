class CreateBusinessHours < ActiveRecord::Migration
  def self.up
    create_table :business_hours do |t|
      t.string :day
      t.string :opening_time
      t.string :closing_time
      t.boolean :closed
      t.integer :listing_id
      t.string :hours_type

      t.timestamps
    end
  end

  def self.down
    drop_table :business_hours
  end
end
