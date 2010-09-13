class CreateMoveInCosts < ActiveRecord::Migration
  def self.up
    create_table :move_in_costs do |t|
      t.integer :unit_type_id
      t.string :Description
      t.float :Amount
      t.string :Name
      t.float :Tax
      t.text :ErrorMessage

      t.timestamps
    end
  end

  def self.down
    drop_table :move_in_costs
  end
end
