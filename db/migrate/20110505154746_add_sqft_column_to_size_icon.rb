class AddSqftColumnToSizeIcon < ActiveRecord::Migration
  def self.up
    add_column :size_icons, :sqft, :integer
    
    SizeIcon.find_each do |s|
      s.update_attribute :sqft, s.width * s.length
    end
  end

  def self.down
    remove_column :size_icons, :sqft
  end
end
