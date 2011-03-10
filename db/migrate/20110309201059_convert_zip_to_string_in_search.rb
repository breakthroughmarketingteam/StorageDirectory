class ConvertZipToStringInSearch < ActiveRecord::Migration
  def self.up
    change_column :searches, :zip, :string
  end

  def self.down
    change_column :searches, :zip, :integer
  end
end
