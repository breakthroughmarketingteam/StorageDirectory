class CreatePredefSizeAssigns < ActiveRecord::Migration
  def self.up
    create_table :predef_size_assigns do |t|
      t.integer :listing_id
      t.integer :predefined_size_id
      t.integer :price
      t.integer :position, :default => 0

      t.timestamps
    end
  end

  def self.down
    drop_table :predef_size_assigns
  end
end
