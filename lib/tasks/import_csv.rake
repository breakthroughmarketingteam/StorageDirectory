namespace :import do
  
  desc "Import Listings from a CSV file."
  task :listings => :environment do
    require 'csv'
    require 'PP'
    
    file = "#{RAILS_ROOT}/lib/tasks/csv_data/#{ARGV.slice!(1)}" # remove and return the second arg, in this case the csv filename
    
    puts "Loading file: #{file}"
    read_file = File.read file
    
    puts "Parsing CSV format"
    records = CSV.parse read_file
    records.shift # discard the header row
    
    puts "Ready to import #{records.size-1} records." # dont count the the header row
    
    puts "Begin filtering records and adding listings to queue..."
    @filtered = {}
    filter_records_and_build_listings records
    puts "Done Filtering. Listings in Queue: #{@filtered[:wanted].size}; Rejected: #{@filtered[:rejected].size}"
    
    puts "Begin geocoding #{@filtered[:wanted].size} listings..."
    @geocoded = []
    @failed = []
    @geocode_count = 0
    @retry_count = 0
    @max_retry = 3
    geocode_with_retry @filtered[:wanted]
    puts "Done Geocoding. Did #{@geocoded.size} listings."
    
    puts "Begin committing #{@geocoded.size} listings to database..."
    @saved = []
    @invalid = []
    import_rows @geocoded
    puts "DONE! imported: #{@saved.size} listings. Invalid listings not saved: #{@invalid.size}"

    exit
  end
end

# get only the storage, moving and truck companies
def filter_records_and_build_listings(records)
  @category = ''; @wanted = []; @rejected = []
  
  @storage_regex = /(storage)|(stge)|(strge)|(container)|(warehouse)/i
  @truck_regex = /(truck)/i
  @moving_regex = /(moving)|(mover)|(van line)/i
  
  records.each_with_index do |row, i|
    # column mappings
    begin
      title   = row[0].titleize
      address = (row[2] || '').titleize
      city    = (row[3] || '').titleize
      state   = row[4]
      zip     = row[5].split(/-|\s/)[0]
      phone   = row[6]
      contact_title      = row[9]
      contact_first_name = row[7]
      contact_last_name  = row[8]
      web_address        = row[1]
      sic_description    = row[10]
    
      if sic_description =~ @storage_regex || title =~ @storage_regex
        @category = 'Storage'
        @listing = Listing.new :title => title, :enabled => true, :default_logo => rand(6), :category => @category
        build_listing_features! title, sic_description
      
      elsif sic_description =~ @truck_regex || title =~ @truck_regex
        @category = 'Trucking'
        @listing = Listing.new :title => title, :enabled => true, :category => @category
      
      elsif sic_description =~ @moving_regex || title =~ @moving_regex
        @category = 'Moving'
        @listing = Listing.new :title => title, :enabled => true, :category => @category
      
      else
        @rejected << row
        puts "Skipped: #{title}, Description: #{sic_description}"
      end
    
      if @listing
        @listing.build_map :address => address, :city => city, :state => state, :zip => zip, :phone   => phone
        @listing.build_contact :title => contact_title, :first_name => contact_first_name, :last_name => contact_last_name, :phone => phone, :sic_description => sic_description
      
        @wanted << @listing
        puts "Added (#{@category}) #{@listing.title} [#{sic_description}] - #{@listing.city}, #{@listing.state}"
      end
    rescue => e
      puts "Row #{i} had bad data. Row: #{row.inspect}\nError: #{e.message}\nDetails: #{e.inspect}"
    end
  end
  
  @filtered = { :wanted => @wanted, :rejected => @rejected }
end

def geocode_with_retry(listings)
  geocode_listings listings
  
  if @failed.size > 0
    retries = @failed; @failed = []
    @retry_count += 1
    
    if @retry_count <= @max_retry
      puts "Retry Geocoding #{retries.size} listings; Retry count: #{@retry_count}"
      geocode_with_retry retries
    else
      puts "Done retrying. #{retries.size} listings were not geocoded."
    end
  else
    puts "Successfuly geocoded #{@geocode_count} listings #{@geocoded.size}"
  end
  
  @geocoded
end

def geocode_listings(listings)
  listings.each do |listing|
    @geocode_count += 1
    
    if @geocode_count % 50 == 0
      puts "geocode count: #{@geocode_count}, waiting for 15 secs..."
      sleep(15)
      puts 'Proceeding...'
    end
    
    if listing.map.auto_geocode_address
      @geocoded << listing
      puts "Successfully geocoded #{listing.title}: [#{listing.map.lat}, #{listing.map.lng}]"
    else
      @failed << listing
      puts "Failed to geocode #{listing.title}"
    end
  end
end

def import_rows(listings)
  listings.each_with_index do |listing, i|
    if listing.save
      @saved << listing
      puts "Saved #{listing.title}!"
    else
      @invalid << listing
      puts "Failed to save #{listing.title}; Error: #{listing.errors.full_messages.map * '; '}"
    end
  end
end

def build_listing_features!(title, sic_description)
  if title =~ /(boat & rv)/i || title =~ /(rv & boat)/i || title =~ /(boat & rv self)/i
    @listing.facility_features.build [{ :title => 'Boat Storage', :description => sic_description }, { :title => 'RV Storage', :description => sic_description }]
  
  elsif title =~ /(Boat Rv & Auto Storage)/i
    @listing.facility_features.build [{ :title => 'Boat Storage', :description => sic_description }, { :title => 'RV Storage', :description => sic_description }, { :title => 'Car Storage', :description => sic_description }]
    
  elsif title =~ /(vehicle & mini)/i || title =~ /(mini & vehicle)/i
    @listing.facility_features.build [{ :title => 'Car Storage', :description => sic_description }, { :title => 'Self Storage', :description => sic_description }]
    
  elsif title =~ /(self & rv)/i || title =~ /(rv & self)/i
    @listing.facility_features.build [{ :title => 'RV Storage', :description => sic_description }, { :title => 'Self Storage', :description => sic_description }]
  
  elsif title =~ /(boat storage)/i || title =~ /(marine storage)/i
    @listing.facility_features.build :title => 'Boat Storage', :description => sic_description
    
  elsif title =~ /(Rv Boat & Mini)/i
    @listing.facility_features.build [{ :title => 'RV Storage', :description => sic_description }, { :title => 'Boat Storage', :description => sic_description }, { :title => 'Self Storage', :description => sic_description }]
    
  elsif title =~ /(rv storage)/i || title =~ /(rv park & storage)/i || title =~ /(rv park)/i
    @listing.facility_features.build :title => 'RV Storage', :description => sic_description
  
  elsif title =~ /(vehicle storage)/i || title =~ /(cars)(storage)/i
    @listing.facility_features.build :title => 'Car Storage', :description => sic_description
  
  elsif (match = title.match(/(self storage)|(mobile storage)|(cold storage)|(car storage)|(mini storage)/i))
      feature = @listing.facility_features.build :title => match.to_s, :description => sic_description
      feature.title = 'Self Storage' if feature.title.downcase == 'mini storage'
  else
    @listing.facility_features.build :title => 'Self Storage', :description => sic_description
  end
end