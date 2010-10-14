class AddSizeIdColumnToInfoRequest < ActiveRecord::Migration
  def self.up
    add_column :info_requests, :size_id, :integer
  end

  def self.down
    remove_column :info_requests, :size_id
  end
end
