class CreateIssnIds < ActiveRecord::Migration
  def self.up
    create_table :issn_ids do |t|
      t.string :model_type
      t.integer :model_id
      t.string :name
      t.integer :value

      t.timestamps
    end
  end

  def self.down
    drop_table :issn_ids
  end
end
