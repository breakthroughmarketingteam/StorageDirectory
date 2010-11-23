class CreatePredefSpecialAssigns < ActiveRecord::Migration
  def self.up
    create_table :predef_special_assigns do |t|
      t.integer :predefined_special_id
      t.integer :client_id
      t.integer :position, :default => 0

      t.timestamps
    end
  end

  def self.down
    drop_table :predef_special_assigns
  end
end
