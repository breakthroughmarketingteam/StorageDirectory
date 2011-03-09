class ConvertColumnInClick < ActiveRecord::Migration
  def self.up
    change_column :clicks, :referrer, :text
  end

  def self.down
    change_column :clicks, :referrer, :string
  end
end
