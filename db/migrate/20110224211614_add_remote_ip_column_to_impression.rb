class AddRemoteIpColumnToImpression < ActiveRecord::Migration
  def self.up
    add_column :impressions, :remote_ip, :string
    add_column :clicks, :remote_ip, :string
  end

  def self.down
    remove_column :impressions, :remote_ip
    remove_column :clicks, :remote_ip
  end
end
