class AddDefaultsToSearch < ActiveRecord::Migration
  def self.up
    change_column :searches, :storage_type, :string, :default => 'self storage'
    change_column :searches, :unit_size, :string, :default => '5x5'
    change_column :searches, :within, :string, :default => 20
  end

  def self.down
  end
end
