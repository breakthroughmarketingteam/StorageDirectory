class AddCategoriesFromFeaturesToListing < ActiveRecord::Migration
  def self.up
    add_column :listings, :storage_types, :string
    
    puts "Caching listings"
    @listings = Listing.all
    amount = @listings.size
    puts "Cached #{amount} listings\n"
    
    @listings.each_with_index do |listing, i|
      if listing.category =~ /(moving)/i
        features = 'moving companies'
      elsif listing.category =~ /(truck)/i
        features = 'truck rentals'
      else
        begin
          features = listing.facility_features.map(&:title).reject(&:nil?).map(&:downcase).join(',')
        rescue => e
          puts "\nERROR: #{e.message}\n"
        end
      end
        
      listing.update_attribute :storage_types, features
      
      $stdout.flush
      print "\r#{sprintf("%.2f", (i.to_f / amount.to_f * 100))}% Done"
    end
  end

  def self.down
    remove_column :listings, :storage_types
  end
end
