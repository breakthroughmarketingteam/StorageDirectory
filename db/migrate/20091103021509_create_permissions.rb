class CreatePermissions < ActiveRecord::Migration
  def self.up
    create_table :permissions do |t|
      t.string :resource
      t.string :action
      t.string :scope
      t.integer :role_id

      t.timestamps
    end
  end

  def self.down
    drop_table :permissions
  end
end
