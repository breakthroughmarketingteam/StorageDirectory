class AddColumnsToSpecial < ActiveRecord::Migration
  def self.up
    add_column :specials, :UseAtWeb, :string
    add_column :specials, :UseAtCounter, :string
    add_column :specials, :sID, :string
    add_column :specials, :LastTimeUpdated, :datetime
    add_column :specials, :UseAtKiosk, :string
    add_column :specials, :CouponCode, :string
    add_column :specials, :ErrorMessage, :string
    rename_column :specials, :code, :Code
    rename_column :specials, :description, :Description
  end

  def self.down
    remove_column :specials, :ErrorMessage
    remove_column :specials, :CouponCode
    remove_column :specials, :UseAtKiosk
    remove_column :specials, :LastTimeUpdated
    remove_column :specials, :sID
    remove_column :specials, :UseAtCounter
    remove_column :specials, :UseAtWeb
    rename_column :specials, :Code, :code
    rename_column :specials, :Description, :description
  end
end
