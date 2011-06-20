namespace :listings do
  
  desc "Make sure all states and full_states are correct"
  task :correct_states do
    listings = Listing.all :conditions => 'LENGTH(state) > 2 OR state IS NULL OR full_state IS NULL'
    total = listings.size
    
    if total > 0
      puts "Found #{total} incorrect states listings"
    
      listings.each do |l|
        state = l.full_state || l.state
        abr = States.abbrev_of state
        puts "State correction #{state} to #{abr}"
        l.state = abr
        l.full_state = States.name_of abr
        l.save
      end
    else
      puts 'Found no problem'
    end
  end
  
  namespace :issn do
    
    desc "Get authorized facilities from ISSN and find a match in our database and add the new IDs to matching listing"
    task :get_new do
      @issn_facs = IssnAdapter.get_authorized_facilities
    
      @issn_facs.each do |fac|
        fac_info = IssnAdapter.get_facility_info 'getFacilityInfo', fac['sFacilityId']
        matches = Listing.all :conditions => ['(address ILIKE :address OR address ILIKE :saddr) AND zip = :zip', { :address => "#{fac_info['sO_Address']}%", :saddr => "#{fac_info['sO_Address'].split(' ').first}%", :zip => fac_info['sO_PostalCode'] }]
      
        if matches.size == 1
          listing = matches.first
        elsif matches.size > 1
          listing = matches.select { |m| !m.user_id.nil? }.first
        else
          listing = nil
        end
      
        if listing && listing.facility_info.nil?
          fi = listing.build_facility_info :O_FacilityId => fac['sFacilityId']
        
          fac_info.each do |key, val|
            fi.send "#{key}=", val if fi.respond_to?(key)
          end
        
          puts "Create facility info for listing (#{listing.id}) #{listing.title} in #{listing.full_address}" if listing.save
        end
      end
    end
  
    desc "Run update_all_issn_data on facilities that have facility_info"
    task :sync do
      fi = FacilityInfo.all
      total = fi.size
      puts "Will sync #{total} facilities"
      
      fi.each do |f|
        f.listing.update_all_issn_data
        puts "Done with listing (#{f.listing_id}) #{f.listing.title} in #{f.listing.full_address}"
      end
      
      puts "DONE!"
    end
    
  end
end