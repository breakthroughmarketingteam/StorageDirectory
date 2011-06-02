class ChangeColumnReferrerInImpressions < ActiveRecord::Migration
  def self.up
    change_column :impressions, :referrer, :text
  end

  def self.down
    change_column :impressions, :referrer, :string
  end
end
