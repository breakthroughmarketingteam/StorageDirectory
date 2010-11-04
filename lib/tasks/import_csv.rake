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
    
    @total = @filtered[:wanted].size; @failed_rows = []; @saved = @count = 0
    puts "Begin saving #{@total} listings..."
    
    @filtered[:wanted].each_with_index do |listing, i|
      @count += 1
      
      if listing.save
        @saved += 1
        puts "Saved #{@saved} of #{@total}, #{percent_of(@count, @total)} done. (#{listing.facility_features.empty? ? listing.category : listing.facility_features.map(&:title) * ', '}) #{listing.title} in #{listing.city}, #{listing.state}"
        
        if listing.map.auto_geocode_address && listing.map.save
          puts "Geocoded listing #{listing.title}: [#{listing.lat}, #{listing.lng}]"
        else
          puts "Failed to Geocode #{listing.title}. Error: #{listing.errors.full_messages.map * '; '}"
          @failed_rows << @filtered[:wanted_rows][i]
          puts "Waiting 30 secs and continuing..."
          do_the_waiting_thing
        end
        
        if @saved % 50 == 0
          puts "HIT #{@saved} requests, waiting for 30 secs"
          do_the_waiting_thing
        end
        
      else
        puts "Error: #{listing.errors.full_messages.map * '; '}"
        @failed_rows << @filtered[:wanted_rows][i]
      end
    end
    
    save_failed_to_file(@failed_rows) and exit # whoopie!
  end
end

# get only the storage, moving and truck companies
def filter_records_and_build_listings(records)
  @category = ''; @wanted = []; @rejected = []; @wanted_rows = []; count = 0; total = records.size
  
  @storage_regex = /(storage)|(stge)|(strge)|(container)|(warehouse)/i
  @truck_regex = /(truck)/i
  @moving_regex = /(moving)|(mover)|(van line)/i
  
  records.each_with_index do |row, i|
    @listing = nil
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
    
      unless Listing.find(:first, :include => :map, :conditions => ['LOWER(listings.title) = ? AND LOWER(maps.address) = ? AND LOWER(maps.city) = ? AND LOWER(maps.state) = ? AND LOWER(maps.zip) = ? AND maps.phone = ?', title.downcase, address.downcase, city.downcase, state.downcase, zip.downcase, phone])
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
        
        if @listing
          @listing.build_map :address => address, :city => city, :state => state, :zip => zip, :phone => phone
          @listing.build_contact :title => contact_title, :first_name => contact_first_name, :last_name => contact_last_name, :phone => phone, :sic_description => sic_description
      
          @wanted << @listing
          @wanted_rows << row
          puts "Added (#{percent_of(count, total)} done) (#{@category}) #{@listing.title} [#{sic_description}] - #{@listing.city}, #{@listing.state}"
        else
          @rejected << row
          puts "Rejected (#{percent_of(count, total)} done): #{title}, Description: #{sic_description}"
        end
      else
        @rejected << row
        puts "Already have (#{percent_of(count, total)} done): #{title}, Description: #{sic_description}"
      end
      
      count += 1
    rescue => e
      puts "Row #{i} had bad data. Row: #{row.inspect}\nError: #{e.message}\nDetails: #{e.inspect}"
    end
  end
  
  @filtered = { :wanted => @wanted, :rejected => @rejected, :wanted_rows => @wanted_rows }
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

def percent_of(is, of)
  "#{sprintf("%.2f", (is.to_f / of.to_f * 100))}%"
end

def do_the_waiting_thing
  30.times do |i|
    sleep 1
    $stdout.flush
    print "\r#{i}"
  end
end