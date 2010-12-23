class CreateBlasts < ActiveRecord::Migration
  def self.up
    create_table :blasts do |t|
      t.integer :email_blast_id
      t.string :blast_type
      t.integer :damage

      t.timestamps
    end
  end

  def self.down
    drop_table :blasts
  end
end
