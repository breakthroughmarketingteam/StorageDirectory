class AddDefaultLogoValuesToListing < ActiveRecord::Migration
  def self.up
    listings = Listing.all
    
    puts "found #{listings.size} listings"
    
    listings.each do |l|
      x = rand(6)
      l.default_logo = x
      if l.save
        puts "def logo #{l.default_logo} for listing #{l.title}"
      else
        l.errors.full_messages * ' '
      end
    end
  end

  def self.down
  end
end
