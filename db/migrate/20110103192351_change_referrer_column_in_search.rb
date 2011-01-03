class ChangeReferrerColumnInSearch < ActiveRecord::Migration
  def self.up
    change_column :searches, :referrer, :text
  end

  def self.down
  end
end
