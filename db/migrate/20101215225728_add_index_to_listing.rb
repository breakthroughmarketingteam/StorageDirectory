class AddIndexToListing < ActiveRecord::Migration
  def self.up
    add_index :listings, :category
    add_index :listings, :enabled
    add_index :listings, :title
    add_index :maps, :state
    add_index :maps, :city
    add_index :maps, :lat
    add_index :maps, :lng
    add_index :posts, :title
    add_index :sizes, :width 
    add_index :sizes, :length
  end

  def self.down
  end
end
