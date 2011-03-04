class MigrateMapsToListing < ActiveRecord::Migration
  
  @@columns_to_add = [:address, :address2, :city, :state, :zip, :lat, :lng]
  @@column_types   = [:string, :string, :string, :string, :string, :float, :float]
  @@columns_to_ignore = [:id, :listing_id, :created_at, :updated_at, :phone]
  
  def self.up
    say_with_time "Migration" do
      puts "Add Columns To Listing"
      @@columns_to_add.each_with_index { |c, i| add_column :listings, c, @@column_types[i] }
      
      puts "Caching Listings and Maps..."
      @listings = Listing.all :include => :map
      
      count = @listings.size
      puts "Cached #{count} Listings"
      
      Listing.transaction do
        puts "Done.\nMigrating columns to listings"
      
        @listings.each_with_index do |listing, i|
          @@columns_to_add.each { |c| eval("listing.#{c} = (c == :zip ? prep_zip(listing.map.#{c}) : listing.map.#{c})") }
          puts "-----> (#{sprintf("%.3f", ((i+1).to_f / count.to_f * 100))}% done) Migrated: Listing (#{listing.id})"
        end
      end
      
      puts "\n\n DONE.\n\n"
    end
  end

  def self.down
    @@columns_to_add.each { |c| remove_column :listings, c }
  end
  
  def self.prep_zip(zip)
    zs = zip.to_s
    if zs.size < 5
      nz = ''
      d = 5 - zip.to_s.size
      d.times { nz << '0' }
      zs = nz + zs
    end
    zs
  end
  
end