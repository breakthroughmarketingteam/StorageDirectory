class CreateUserHintPlacements < ActiveRecord::Migration
  def self.up
    create_table :user_hint_placements do |t|
      t.boolean :hide
      t.integer :position

      t.timestamps
    end
  end

  def self.down
    drop_table :user_hint_placements
  end
end
