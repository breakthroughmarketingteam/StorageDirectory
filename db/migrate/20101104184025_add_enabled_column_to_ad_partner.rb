class AddEnabledColumnToAdPartner < ActiveRecord::Migration
  def self.up
    add_column :ad_partners, :enabled, :boolean
  end

  def self.down
    remove_column :ad_partners, :enabled
  end
end
