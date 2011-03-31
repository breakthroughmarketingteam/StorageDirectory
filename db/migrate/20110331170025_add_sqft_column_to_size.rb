class AddSqftColumnToSize < ActiveRecord::Migration
  def self.up
    add_column :sizes, :sqft, :integer
    Size.find_each { |s| s.update_attribute :sqft, (s.length * s.width) }
  end

  def self.down
    remove_column :sizes, :sqft
  end
end
