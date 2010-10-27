namespace :import do
  
  desc "Import Listings from a CSV file."
  task :listings => :environment do
    require 'csv'
  
    file = "#{RAILS_ROOT}/lib/tasks/csv_data/#{ARGV[1]}"
    
    puts "Loading file: #{file}"
    read_file = File.read file
    
    puts "Parsing CSV format"
    records = CSV.parse read_file
    
    puts "Ready to import #{records.size} records."
  
    results = import_rows records
    
    puts "\nWe got #{failures.size} failures, retrying those...\n"
    import_rows results[:failures] unless results[:failures].empty?

    puts "DONE. imported: #{results[:saved]}, failures: #{results[:failures].size}"
  end
end

def import_rows(records)
  count = 0; saved = 0; failures = []
  
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
    
    if sic_description =~ @storage_regex || title =~ @storage_regex
      listing = Listing.new :title => title, :enabled => true, :default_logo => rand(6)
        
      if title =~ /(boat & rv storage)/i || title =~ /(rv & boat storage)/i
        listing.facility_features.build [{ :title => 'Boat Storage', :description => sic_description }, { :title => 'RV Storage', :description => sic_description }]
      
      elsif title =~ /(vehicle & mini storage)/i || title =~ /(mini & vehicle storage)/i
        listing.facility_features.build [{ :title => 'Car Storage', :description => sic_description }, { :title => 'Self Storage', :description => sic_description }]
        
      elsif title =~ /(self & rv storage)/i || title =~ /(rv & self storage)/i
        listing.facility_features.build [{ :title => 'RV Storage', :description => sic_description }, { :title => 'Self Storage', :description => sic_description }]
      
      elsif title =~ /(boat storage)/i
        listing.facility_features.build :title => 'Boat Storage', :description => sic_description
        
      elsif title =~ /(rv storage)/i || title =~ /(rv park & storage)/i || title =~ /(rv park)/i
        listing.facility_features.build :title => 'RV Storage', :description => sic_description
      
      elsif title =~ /(vehicle storage)/i
        listing.facility_features.build :title => 'Car Storage', :description => sic_description
      
      elsif (match = title.match(/(self storage)|(mobile storage)|(cold storage)|(car storage)|(mini storage)/i))
          feature = listing.facility_features.build :title => match.to_s, :description => sic_description
          feature.title = 'Self Storage' if feature.title.downcase == 'mini storage'
      else
        listing.facility_features.build :title => 'Self Storage', :description => sic_description
      end
    
      listing.build_map :address => address, :city => city, :state => state, :zip => zip, :phone   => phone
      listing.build_contact :title => contact_title, :first_name => contact_first_name, :last_name => contact_last_name, :phone => phone, :sic_description => sic_description
      
      if listing.save
        saved += 1
        puts "Created (#{match}) Listing: #{listing.title}, City: #{listing.city}, State: #{listing.state}\n"
      else
        if listings.errors.full_messages.any? { |e| e =~ /(could not geocode address)/i }
          puts "Failed to GEOCODE: #{listing.map.full_address}"
          puts "Retrying in 15 secs..."
          sleep 15
          
          if listing.save
            saved += 1
            puts "SUCCESS! Created (#{match}) Listing: #{listing.title}, City: #{listing.city}, State: #{listing.state}\n"
          else
            puts "ENNNGGG!!"
            failures << row
            puts "Threw row ##{i}: \"#{row[0]}\" in the failure bucket."
            puts "Failure bucket has #{failure.size} rows in it now."
          end
        else
          puts "Record ##{i} failed to import. Error: #{listing.errors.full_messages * ' '}\n"
        end
      end
      
      count += 1
      
      if count % 50 == 0
        puts "Hit #{count} records, waiting for few secs...\n"
        sleep 3
        puts "Ok Proceeding..."
      end
      
    elsif sic_description =~ @truck_regex || title =~ @truck_regex
      
    else
      puts "Skipped: #{title}, Description: #{sic_description}"
    end
  end
  
  { :failures => failures, :saved => saved }
end