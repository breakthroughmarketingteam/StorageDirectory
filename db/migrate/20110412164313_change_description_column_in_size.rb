class ChangeDescriptionColumnInSize < ActiveRecord::Migration
  def self.up
    change_column :sizes, :description, :text
  end

  def self.down
    change_column :sizes, :description, :string
  end
end
