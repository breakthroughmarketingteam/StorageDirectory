class ReplaceRequestUriColumnInImpressions < ActiveRecord::Migration
  def self.up
    change_column :impressions, :request_uri, :text
  end

  def self.down
    change_column :impressions, :request_uri, :string
  end
end
