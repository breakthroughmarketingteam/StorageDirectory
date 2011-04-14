class ContinueFullStateInListing2 < ActiveRecord::Migration
  def self.up
    puts '-----> 2 Caching listings with for full_state'
    listings = Listing.all :conditions => { :full_state => nil }, :limit => 10_000
    count = listings.size
    puts "-----> Cached #{count} listings"
    
    listings.each_with_index do |listing, i|
      listing.update_attributes :state => States.abbrev_of(listing.state), :full_state => States.name_of(listing.state)
      puts "-----> #{sprintf("%.2f", ((i+1).to_f / count.to_f * 100))}% done. updated listing #{listing.id}"
    end
    
    puts "DONE"
  end

  def self.down
  end
end
