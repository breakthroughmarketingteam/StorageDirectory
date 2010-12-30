class ReDoIndexOnListing < ActiveRecord::Migration
  def self.up
    #remove_index :listings, :column => :category
    #remove_index :listings, :column => :enabled
    #remove_index :listings, :column => :title
    #remove_index :listings, :name => :index_listings_on_id_and_user_id_and_title
    
  end

  def self.down
  end
end
