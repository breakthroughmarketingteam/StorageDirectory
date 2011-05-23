namespace :scrubber do
  desc 'Clean duplicates out'
  task :remove_dups, :class_name do |t, args|
    require 'PP'
    
    # monkey patch AR just for now.
    class ActiveRecord::Base
      def non_id_attributes
        atts = self.attributes
        atts.delete 'id'
        atts.delete 'listing_id'
        atts.delete 'created_at'
        atts.delete 'updated_at'
        atts
      end
    end
    
    begin
      class_name = args.class_name.camelcase.constantize
    rescue NameError
      puts "Not a valid class name, tryed: #{args.class_name.camelcase}"
      exit
    end
    
    records = class_name.find(:all)
    total = records.size
    puts  "Finding duplicates for #{class_name} in #{total} records"
    
    group_count = select_count = redun_count = 0;
    
    duplicate_groups = records.group_by do |element|
      puts "Group by (#{percent_of(group_count, total)} done) Processing: #{element.inspect}"
      group_count += 1
      element.non_id_attributes
    end.select do |gr|
      if gr.last.size > 1
        puts "Selecting (#{percent_of(select_count, total)} done) #{gr.inspect}"
      else
        puts "Not selected (#{percent_of(select_count, total)} done) #{gr.inspect}"
      end
      
      select_count += 1
      gr.last.size > 1
    end
    
    redundant_elements = duplicate_groups.map do |group|
      puts "Getting Redundant (#{percent_of(redun_count, total)} done): #{(group.last - [group.last.first]).inspect}"
      redun_count += 1
      group.last - [group.last.first]
    end.flatten
    
    redun_total = redundant_elements.size; destroy_count = 0
    puts "Found #{redun_total} redundant records, Detroying..."
    
    redundant_elements.map do |r|
      puts "Destroying (#{percent_of(destroy_count, redun_total)} done): #{r.inspect}"
      destroy_count += 1
      r.listing.destroy
      r.destroy
    end
    
  end
end

namespace :geocode do
  desc 'Geocode listings with nil lat or lng'
  task :listings => :environment do
    require 'fastercsv'
    puts 'Finding listings to regeocode'
    
    @listings = Listing.all :include => :map, :conditions => 'maps.lat IS NULL'
    @total = @listings.size; @geocoded = []; @failed = []
    
    puts "Geocoding #{@total} listings"
    
    @listings.each_with_index do |listing, i|
      if listing.auto_geocode_address
        listing.save
        @geocoded << listing
        puts "Geocoded (#{percent_of i, @total} done) listing #{listing.title} in #{listing.city}, #{listing.state} [#{listing.lat}, #{listing.lng}]"
        
        if i+1 % 50 == 0
          puts "HIT 50 records, waiting for 30 secs"  
          do_the_waiting_thing
        end
      else
        puts "Failed to geocode listing #{listing.title} in #{listing.city}, #{listing.state}"
        @failed << listing
      end
    end
    
    puts "Done! Geocoded: #{@geocoded.size} listings; Failed: #{@failed.size}"
    save_to_csv @failed, 'failed_to_geocode'
  end
end

namespace :import do
  
  desc 'Import Listings from a CSV file.'
  task :listings, :file_name do |t, args|
    records = load_from_csv args.file_name
    
    puts "Begin filtering records and adding listings to queue..."
    @filtered = {}
    filter_records_and_build_listings records
    puts "Done Filtering. Listings in Queue: #{@filtered[:wanted].size}; Rejected: #{@filtered[:rejected].size}"
    
    @total = @filtered[:wanted].size; @failed_rows = []; @saved = @count = 0
    puts "Begin saving #{@total} listings..."
    
    save_to_csv @filtered[:wanted_rows], 'wanted_records'
    
    @filtered[:wanted].each_with_index do |listing, i|
      @count += 1
      
      if listing.save
        @saved += 1
        puts "Saved #{@saved} of #{@total}, #{percent_of(@count, @total)} done. (#{listing.facility_features.empty? ? listing.category : listing.facility_features.map(&:title) * ', '}) #{listing.title} in #{listing.city}, #{listing.state}"
        
        if listing.auto_geocode_address && listing.save
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
    
    save_to_csv(@failed_rows, 'failed_records') and exit # whoopie!
  end
  
  desc 'Import from a csv file'
  task :custom, :file_name do |t, args|
    records = load_from_csv args.file_name
    filtered = []; total = records.size
    
    records.each_with_index do |row, i|
      begin
        title   = row[0].try :titleize
        address = row[1].try :titleize
        city    = row[2].try :titleize
        state   = row[3]
        zip     = row[4].blank? ? nil : row[4].split('-')[0].to_s
        phone2  = row[5]
        phone   = row[6]
        email   = row[7]
        category = row[8]
        type    = row[9]
        
        zip = zip.size < 5 ? "0#{zip}" : zip unless zip.blank?
      rescue => e
        puts "Row #{i} had bad or insufficient data. Error: #{e.message}"
      end
      
      unless city.blank? #address.blank? || address.match(/(po box)/i) || zip.blank?
        listing = Listing.new :title => title, :category => category, :address => address, :city => city, :state => state, :zip => zip, :phone => (phone.match(/(N\/A)/i) ? nil : phone)
        listing.facility_features.build :title => type
        listing.build_contact :phone => phone2, :email => email
        
        puts "Added to queue (#{percent_of(i, total)} done): #{listing.title}"
        filtered << listing
      else
        puts "Skipped row #{i}: #{title} Address:#{address} #{city}, #{state} #{zip}"
      end
    end
    
    queued = filtered.size
    puts "Queued up #{queued} listings; #{percent_of(queued, total)} of file. Saving to db and geocoding..."
    saved = 0; failed = 0; geocoded = 0; not_geocoded = 0
    
    filtered.each_with_index do |listing, i|
      if listing.save false
        saved += 1
        puts "Saved (#{saved} of #{queued}; #{percent_of(i, queued)}): #{listing.title}"
=begin
        if listing.auto_geocode_address
          geocoded += 1
          puts "Geocoded (#{geocoded} of #{queued}; #{percent_of(i, queued)}) #{listing.city}, #{listing.state} [#{listing.lat}, #{listing.lng}]"
        else
          not_geocoded += 1
          puts "Failed to Geocode (#{not_geocoded}) #{listing.title} #{listing.city}, #{listing.state} #{listing.zip}"
        end
=end
      else
        failed += 1
        puts "Error saving #{listing.title} Error: #{listing.errors.full_messages.map * '; '}"
      end
    end
    
    puts "DONE! #{percent_of(geocoded, queued)} Success; Saved: #{saved}; Geocoded: #{geocoded}; Failed: #{failed}; Not Geocoded: #{not_geocoded}"
  end
  
  desc "Import from a csv from Callsource reporting"
  task :cs_list do
    records  = load_from_csv 'cs_cust_list.csv'
    total    = records.size
    grouping = {}
    
    records.each_with_index do |row, i|
      title     = row[0]
      cust_code = row[1]
      dphone, phone   = dashed_phone(row[8]), plain_phone(row[8])
      tdphone, tphone = dashed_phone(row[9]), plain_phone(row[9])
      id  = cust_code.split('-').first.to_i
      num = cust_code.split('-').last.to_i
      
      listing_finder = Proc.new do |c|
        l = c.enabled_listings.find :first, :conditions => ['title = ? OR (phone = ? OR phone = ? OR tracked_number = ? OR tracked_number = ?)', title, dphone, phone, tdphone, tphone]
        l = c.enabled_listings.first if l.nil? && c.enabled_listings.count == 0
        l
      end
      
      if grouping[id]
        listing = listing_finder.call grouping[id][:c]
        grouping[id][:listings] << { :n => num, :t => title, :dp => dphone, :tdp => tdphone, :l => listing }
      else
        client = Client.find_by_id id
        
        if client
          listing = listing_finder.call client          
          grouping[id] = { :c => client, :title => title, :listings => [{ :n => num, :t => title, :dp => dphone, :tdp => tdphone, :l => listing }] }
        end
      end
    end
    
    raise grouping.pretty_inspect
  end
  
end

def dashed_phone(p)
  return '' if p.nil?
  p.gsub(/\(|\)/, '').sub(' ', '-').gsub(/\s/, '')
end

def plain_phone(p)
  return '' if p.nil?
  p.gsub /\D/, ''
end

def load_from_csv(file_name, has_header = true)
  require 'fastercsv'
  file = "#{RAILS_ROOT}/lib/tasks/csv_data/#{file_name}"
  
  puts "Loading and Parsing CSV file"
  records = FasterCSV.read file
  records.shift if has_header
  
  puts "Ready to import #{records.size} records."
  records
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

# helper methods
def save_to_csv(records, filename)
  require 'fastercsv'
  if records.size > 0
    path = "#{RAILS_ROOT}/lib/tasks/csv_data/#{filename}.csv"
    puts "Saving #{records.size} failed records to file (#{path})"
    
    FasterCSV.open(path, 'w') do |csv|
      records.each do |record|
        if record.respond_to? :map
          csv << record.attributes.values + record.map.attributes.values
        else
          csv << record
        end
      end
    end
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