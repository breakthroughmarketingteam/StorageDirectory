namespace :import do
  
  desc "Import Listings from a CSV file."
  task :listings => :environment do
    require 'csv'
    
    file = "#{RAILS_ROOT}/lib/tasks/csv_data/#{ARGV.slice!(1)}" # remove and return the second arg, in this case the csv filename
    
    puts "Loading file: #{file}"
    read_file = File.read file
    
    puts "Parsing CSV format"
    records = CSV.parse read_file
    
    puts "Ready to import #{records.size-1} records." # dont count the the header row
  
    results = import_rows records
    
    unless results[:failures].empty?
      puts "\nWe got #{results[:failures].size} failures, retrying those...\n"
      raise results[:failures].inspect
      import_rows results[:failures]
    end

    puts "DONE. imported: #{results[:saved]}, failures: #{results[:failures].size}"
  end
end

def import_rows(records)
  category = ''; count = 0; saved = 0; failures = []; results = {}
  
  records.each_with_index do |row, i|
    next if i == 0 # skip header row
    
    # column mappings
    title   = row[0].titleize      # COMPANY_NAME
    address = (row[2] || '').titleize      # PRIMARY_ADDRESS
    city    = (row[3] || '').titleize      # PRIMARY_CITY
    state   = row[4]               # PRIMARY_STATE
    zip     = row[5].split(/-|\s/)[0] # PRIMARY_ZIP10
    phone   = row[6]               # PRIMARY_PHONE
    contact_title      = row[9]
    contact_first_name = row[7]
    contact_last_name  = row[8]
    web_address        = row[1]
    sic_description    = row[10]
    
    @storage_regex = /(storage)|(stge)|(strge)|(container)|(warehouse)/i
    @truck_regex = /(truck)/i
    @moving_regex = /(moving)|(mover)|(van line)/i
    
    if sic_description =~ @storage_regex || title =~ @storage_regex
      category = 'Storage'
      listing = Listing.new :title => title, :enabled => true, :default_logo => rand(6), :category => category
        
      if title =~ /(boat & rv)/i || title =~ /(rv & boat)/i || title =~ /(boat & rv self)/i
        listing.facility_features.build [{ :title => 'Boat Storage', :description => sic_description }, { :title => 'RV Storage', :description => sic_description }]
      
      elsif title =~ /(Boat Rv & Auto Storage)/i
        listing.facility_features.build [{ :title => 'Boat Storage', :description => sic_description }, { :title => 'RV Storage', :description => sic_description }, { :title => 'Car Storage', :description => sic_description }]
        
      elsif title =~ /(vehicle & mini)/i || title =~ /(mini & vehicle)/i
        listing.facility_features.build [{ :title => 'Car Storage', :description => sic_description }, { :title => 'Self Storage', :description => sic_description }]
        
      elsif title =~ /(self & rv)/i || title =~ /(rv & self)/i
        listing.facility_features.build [{ :title => 'RV Storage', :description => sic_description }, { :title => 'Self Storage', :description => sic_description }]
      
      elsif title =~ /(boat storage)/i || title =~ /(marine storage)/i
        listing.facility_features.build :title => 'Boat Storage', :description => sic_description
        
      elsif title =~ /(Rv Boat & Mini)/i
        listing.facility_features.build [{ :title => 'RV Storage', :description => sic_description }, { :title => 'Boat Storage', :description => sic_description }, { :title => 'Self Storage', :description => sic_description }]
        
      elsif title =~ /(rv storage)/i || title =~ /(rv park & storage)/i || title =~ /(rv park)/i
        listing.facility_features.build :title => 'RV Storage', :description => sic_description
      
      elsif title =~ /(vehicle storage)/i || title =~ /(cars)(storage)/i
        listing.facility_features.build :title => 'Car Storage', :description => sic_description
      
      elsif (match = title.match(/(self storage)|(mobile storage)|(cold storage)|(car storage)|(mini storage)/i))
          feature = listing.facility_features.build :title => match.to_s, :description => sic_description
          feature.title = 'Self Storage' if feature.title.downcase == 'mini storage'
      else
        listing.facility_features.build :title => 'Self Storage', :description => sic_description
      end
      
    elsif sic_description =~ @truck_regex || title =~ @truck_regex
      category = 'Trucking'
      listing = Listing.new :title => title, :enabled => true, :category => category
      
    elsif sic_description =~ @moving_regex || title =~ @moving_regex
      category = 'Moving'
      listing = Listing.new :title => title, :enabled => true, :category => category
      
    else
      puts "Skipped: #{title}, Description: #{sic_description}"
    end
    
    if listing
      listing.build_map :address => address, :city => city, :state => state, :zip => zip, :phone   => phone
      listing.build_contact :title => contact_title, :first_name => contact_first_name, :last_name => contact_last_name, :phone => phone, :sic_description => sic_description
    
      save_listing_with_retry category, listing, count do |save, failure|
        saved += save if save
        failures << failure if failure
      end
    end
  end
  
  { :saved => saved, :failures => failures }
end

def save_listing_with_retry(category, listing, count)
  saved = failure = nil
  
  if listing.save
    saved = 1
    puts "Created #{category}: (#{listing.facility_features.map(&:title) * ', '}) #{listing.title}, City: #{listing.city}, State: #{listing.state}\n"
  else
    if listings.errors.full_messages.any? { |e| e =~ /(could not geocode address)/i }
      puts "Failed to GEOCODE: #{listing.map.full_address}"
      puts "Retrying in 15 secs..."
      sleep 15
      
      if listing.save
        saved = 1
        puts "SUCCESS! Created (#{match}) Listing: #{listing.title}, City: #{listing.city}, State: #{listing.state}\n"
      else
        puts "ENNNGGG!!"
        failure = row
        puts "Threw row ##{i}: \"#{row[0]}\" in the failure bucket."
        puts "Failure bucket has #{failure.size} rows in it now."
      end
    else
      puts "Record ##{i} #{category} - failed to import. Error: #{listing.errors.full_messages * ' '}\n"
    end
  end
  
  count += 1
  if count % 50 == 0
    puts "Hit #{count} records, waiting for few secs...\n"
    sleep 3
    puts "Ok Proceeding..."
  end
  
  yield saved, failure
end