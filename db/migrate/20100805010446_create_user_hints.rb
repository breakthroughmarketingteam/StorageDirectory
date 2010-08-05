class CreateUserHints < ActiveRecord::Migration
  def self.up
    create_table :user_hints do |t|
      t.string :title
      t.text :description
      t.text :content
      t.string :place

      t.timestamps
    end
  end

  def self.down
    drop_table :user_hints
  end
end
