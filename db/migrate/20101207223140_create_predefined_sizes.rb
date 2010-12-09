class CreatePredefinedSizes < ActiveRecord::Migration
  def self.up
    create_table :predefined_sizes do |t|
      t.string :title
      t.text :description
      t.integer :width
      t.integer :length

      t.timestamps
    end
  end

  def self.down
    drop_table :predefined_sizes
  end
end
