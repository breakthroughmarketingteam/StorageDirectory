class AddShortUrlsToListings < ActiveRecord::Migration
  def self.up
    puts '-----> Caching listings with no short url'
    listings = Listing.all :conditions => { :short_url => nil }, :limit => 15_000
    count = listings.size
    puts "-----> Cached #{count} listings"
    
    listings.each_with_index do |listing, i|
      Listing.set_short_url listing
      puts "-----> #{sprintf("%.2f", (i.to_f / count.to_f * 100))}% done. updated listing #{listing.id}"
    end
    
    puts "DONE"
  end

  def self.down
  end
end
