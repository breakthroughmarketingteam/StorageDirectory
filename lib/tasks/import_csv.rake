namespace :import do
  
  desc "Import Listings from a CSV file."
  task :listings => :environment do
    require 'fastercsv'
    require 'PP'
    
    file = "#{RAILS_ROOT}/lib/tasks/csv_data/#{ARGV.slice!(1)}" # remove and return the second arg, in this case the csv filename
    
    puts "Loading and Parsing CSV file"
    records = FasterCSV.read file
    records.shift # discard the header row
    
    puts "Ready to import #{records.size-1} records." # dont count the the header row
    
    puts "Begin filtering records and adding listings to queue..."
    @filtered = {}
    filter_records_and_build_listings records
    puts "Done Filtering. Listings in Queue: #{@filtered[:wanted].size}; Rejected: #{@filtered[:rejected].size}"
    
    @failed = @failed_rows = []
    
    puts "Begin saving #{@listings.size} listings..."
    @filtered[:wanted].each_with_index do |listing, i|
      if listing.save
        puts "Saved (#{listing.facility_features.map(&:title) * ', '}) #{listing.title} in #{listing.city}, #{listing.state}, [#{listing.lat}, @#{listing.lng}]"
      else
        puts "Error: #{listing.errors.full_messages.map * '; '}"
        @failed << listing
        @failed_rows << @filtered[:wanted_rows][i]
      end
    end
    
    save_failed_to_file(@failed_rows) and exit # whoopie!
  end
end

# get only the storage, moving and truck companies
def filter_records_and_build_listings(records)
  @category = ''; @wanted = []; @rejected = []; @wanted_rows = []
  
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
    
      if Listing.find(:first, :include => :map, :conditions => { :title => title, :address => address, :city => city, :state => state, :zip => zip, :phone => phone }).nil?
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
        end
      else
        @rejected << row
        puts "Skipped: #{title}, Description: #{sic_description}"
      end
    
      if @listing
        @listing.build_map :address => address, :city => city, :state => state, :zip => zip, :phone   => phone
        @listing.build_contact :title => contact_title, :first_name => contact_first_name, :last_name => contact_last_name, :phone => phone, :sic_description => sic_description
      
        @wanted << @listing
        @wanted_rows << row
        puts "Added (#{@category}) #{@listing.title} [#{sic_description}] - #{@listing.city}, #{@listing.state}"
      end
    rescue => e
      puts "Row #{i} had bad data. Row: #{row.inspect}\nError: #{e.message}\nDetails: #{e.inspect}"
    end
  end
  
  @filtered = { :wanted => @wanted, :rejected => @rejected, :wanted_rows => @wanted_rows }
end

def process_with_retry(listings)
  geocode_and_save listings
  
  if @failed.size > 0
    retries = @failed; @failed = []
    @retry_count += 1
    
    if @retry_count <= @max_retry
      puts "Retry Geocoding #{retries.size} listings; Retry count: #{@retry_count}"
      process_with_retry retries
    else
      puts "Done retrying. #{retries.size} listings were not geocoded."
    end
  else
    puts "Successfuly geocoded #{@geocode_count} listings #{@geocoded.size}"
  end
  
  @failed = retries || []
  @geocoded
end

def geocode_and_save(listings)
  listings.each do |listing|
    if listing.map.auto_geocode_address
      @geocoded << listing
      puts "Successfully geocoded #{listing.title}: [#{listing.map.lat}, #{listing.map.lng}]"
      puts "Saving..."
      if listing.save
        puts "Saved listing #{listing.title}, #{listing.city}, #{listing.state}"
      else
        @failed << listing
        puts "Error saving listing #{listing.title}. Error: #{listing.errors.full_messages.map * '; '}"
      end
    else
      @failed << listing
      puts "Failed to geocode #{listing.title}"
    end
    
    @geocode_count += 1
    
    if @geocode_count % 50 == 0
      puts "geocode count: #{@geocode_count}, waiting for 15 secs..."
      sleep(30)
      puts 'Proceeding...'
    end
  end
end

def save_failed_to_file(records)
  if records.size > 0
    path = "#{RAILS_ROOT}/lib/tasks/csv_data/failed_records.csv"
    puts "Saving #{records.size} failed records to file (#{path})"
    
    FasterCSV.open(path, 'w') do |csv|
      records.each { |record| csv << record }
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