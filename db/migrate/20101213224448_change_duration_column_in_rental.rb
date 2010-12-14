class ChangeDurationColumnInRental < ActiveRecord::Migration
  def self.up
    change_column :rentals, :duration, :integer
  end

  def self.down
    change_column :rentals, :duration, :string
  end
end
