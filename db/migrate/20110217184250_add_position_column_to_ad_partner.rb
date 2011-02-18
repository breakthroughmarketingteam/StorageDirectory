class AddPositionColumnToAdPartner < ActiveRecord::Migration
  def self.up
    add_column :ad_partners, :position, :integer, :default => 0
  end

  def self.down
    remove_column :ad_partners, :position
  end
end
