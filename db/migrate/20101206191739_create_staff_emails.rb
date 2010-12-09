class CreateStaffEmails < ActiveRecord::Migration
  def self.up
    create_table :staff_emails do |t|
      t.integer :listing_id
      t.string :email

      t.timestamps
    end
  end

  def self.down
    drop_table :staff_emails
  end
end
