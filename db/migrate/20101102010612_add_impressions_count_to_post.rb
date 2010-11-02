class AddImpressionsCountToPost < ActiveRecord::Migration
  def self.up
    add_column :posts, :impressions_count, :integer, :default => 0
  end

  def self.down
    remove_column :posts, :impressions_count
  end
end
