class DefaultZeroProfileCompletionOnListing < ActiveRecord::Migration
  def self.up
    puts '-----> Caching listings with no profile completion'
    listings = Listing.all :conditions => { :profile_completion => nil }, :limit => 10_000
    count = listings.size
    puts "-----> Cached #{count} listings"
    
    listings.each_with_index do |listing, i|
      listing.update_attribute :profile_completion, 0 if listing.profile_completion.blank?
      puts "-----> #{sprintf("%.2f", (i.to_f / count.to_f * 100))}% done. updated listing #{listing.id}"
    end
    
    puts "DONE"
  end

  def self.down
  end
  
end
