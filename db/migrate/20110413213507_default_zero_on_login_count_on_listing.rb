class DefaultZeroOnLoginCountOnListing < ActiveRecord::Migration
  def self.up
    puts '-----> Caching listings'
    listings = Listing.all :limit => 7000
    count = listings.size
    puts "-----> Cached #{count} listings"
    
    listings.each_with_index do |listing, i|
      listing.update_attribute :clicks_count, 0 if listing.clicks_count.nil?
      listing.update_attribute :impressions_count, 0 if listing.impressions_count.nil?
      listing.update_attribute :info_requests_count, 0 if listing.info_requests_count.nil?
      
      puts "-----> #{sprintf("%.2f", (i.to_f / count.to_f * 100))}% done. updated listing #{listing.id}"
    end
    
    puts "DONE"
  end

  def self.down
  end
end
