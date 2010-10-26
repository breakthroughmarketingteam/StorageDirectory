class AddDefaultLogoValuesToListing < ActiveRecord::Migration
  def self.up
    listings = Listing.all
    
    puts "found #{listings.size} listings"
    
    listings.each do |l|
      x = rand(6)
      l.default_logo = x
      l.save
      puts "def logo #{x} for listing #{l.title}"
    end
  end

  def self.down
  end
end
