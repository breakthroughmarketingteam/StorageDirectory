class CreateIssnUnitTypeSizes < ActiveRecord::Migration
  def self.up
    create_table :issn_unit_type_sizes do |t|
      t.string :Description
      t.integer :SQFT
      t.string :sID
      t.integer :Length
      t.integer :Width

      t.timestamps
    end
  end

  def self.down
    drop_table :issn_unit_type_sizes
  end
end
