class AddAvailabilityColumnToSize < ActiveRecord::Migration
  def self.up
    add_column :sizes, :availability, :integer
  end

  def self.down
    remove_column :sizes, :availability
  end
end
