class CreateUnsubs < ActiveRecord::Migration
  def self.up
    create_table :unsubs do |t|
      t.string :name
      t.string :subscriber_type
      t.integer :subscriber_id

      t.timestamps
    end
  end

  def self.down
    drop_table :unsubs
  end
end
