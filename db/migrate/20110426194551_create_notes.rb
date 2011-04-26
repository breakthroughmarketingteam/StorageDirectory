class CreateNotes < ActiveRecord::Migration
  def self.up
    create_table :notes do |t|
      t.text :content
      t.integer :user_id
      t.string :status
      t.integer :created_by

      t.timestamps
    end
  end

  def self.down
    drop_table :notes
  end
end
