class CreateListingContacts < ActiveRecord::Migration
  def self.up
    create_table :listing_contacts do |t|
      t.string :title
      t.string :first_name
      t.string :last_name
      t.string :phone
      t.string :web_address
      t.string :sic_description
      t.integer :listing_id

      t.timestamps
    end
  end

  def self.down
    drop_table :listing_contacts
  end
end
