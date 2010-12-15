class ChangeColumnsInSpecial < ActiveRecord::Migration
  def self.up
    rename_column :specials, :amount, :value
    remove_column :specials, :code
    remove_column :specials, :content
  end

  def self.down
    rename_column :specials, :value, :amount
    add_column :specials, :code, :string
    add_column :specials, :content, :text
  end
end
