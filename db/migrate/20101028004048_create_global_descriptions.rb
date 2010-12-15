class CreateGlobalDescriptions < ActiveRecord::Migration
  def self.up
    create_table :listing_descriptions do |t|
      t.text :description
      t.string :show_in
      t.integer :client_id
      t.integer :listing_id

      t.timestamps
    end
  end

  def self.down
    drop_table :listing_descriptions
  end
end
