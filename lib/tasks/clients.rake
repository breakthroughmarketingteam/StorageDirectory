namespace :clients  do
  
  desc "Auto (kinda) activate new clients"
  task :activate_new => :environment do
    t = Time.local(2011, 3, 15, 9)
    puts "\nCaching client models created on #{t.asctime}..."
    @clients = Client.inactive.select { |c| c.created_at > t }
    
    puts "Preparing to activate #{@clients.size} clients\n"
    
    @clients.each do |c|
      c.status = 'active'
      c.activated_at = Time.now
      c.enable_listings!
      c.save
      Notifier.deliver_client_activation c
      puts "-----> Activated client #{c.name}. Email: #{c.email} Password: #{c.temp_password}"
    end
    
    puts "\nDONE\n\n"
  end
  
  desc 'Get oldest clients, generate temporary csv and send as attachment to info'
  task :oldest do
    require 'fastercsv'
    
    puts 'Caching active clients older than 2 months'
    clients = Client.activated.find :all, :conditions => ['created_at <= ?', 2.months.ago], :order => 'created_at ASC', :include => :listings
    data = []; t = Time.now; count = clients.size
    
    puts "Done.\nGathering data for #{count} clients"
    
    clients.each_with_index do |c, i|
      data << [c.name, {
        :id          => c.id,
        :email       => c.email,
        :phone       => c.phone,
        :company     => c.company,
        :num_fac     => c.listings.count,
        :created     => c.created_at.strftime("%a %b, %d %Y"),
        :days_on     => (t.to_date - c.created_at.to_date).to_i,
        :clicks      => c.listings.map { |l| l.clicks.count }.sum,
        :impressions => c.listings.map { |l| l.impressions.count }.sum,
        :phone_views => c.listings.map { |l| l.phone_views.count }.sum
      }]
      
      puts "#{sprintf("%.2f", ((i + 1).to_f / count.to_f * 100))}% done. #{c.name}: #{c.company}"
    end
    
    path = "#{RAILS_ROOT}/tmp/oldest_clients-#{t.strftime '%Y%m%d'}.csv"
    puts "Done.\nSorting and writing to CSV file in #{path}"

    # cuz i changed the order to ASC
    #data = data.sort { |a, b| a[1][:days_on] <=> b[1][:days_on] }.reverse
    
    FasterCSV.open(path, 'w') do |csv|
      csv << ['Name', 'Email', 'Phone', 'Company', 'Joined', 'Days Joined', '# Facilities', '# Impressions', '# Clicks', '# Phone Views']
      
      data.each do |c|
        name, info = c[0], c[1]
        csv << [name, info[:email], info[:phone], info[:company], info[:created], info[:days_on], info[:num_fac], info[:impressions], info[:clicks], info[:phone_views]]
      end
    end
    
    Notifier.deliver_old_client_file path
    puts 'Done.'
  end
  
  desc "In case not all active clients' listings are marked verify"
  task :ensure_listings_verified do
    clients = Client.activated
    
    if clients.map(&:enabled_listings).flatten.map(&:status).flatten.include?(nil)
      puts "Correcting nil statuses on active client listings"
      
      clients.each do |client|
        client.listings.each do |listing|
          next unless listing.status.nil?
          listing.status = 'verified'
          listing.save 
          puts "Updated listing #{listing.id}"
        end
      end
    end
  end
  
  desc "Send trial ends notification"
  task :trial_ends do
    puts "Caching clients..."
    clients = Client.all :conditions => ['billing_status NOT IN (?)', ['paying', 'basic', 'extend trial']], :order => 'created_at ASC'
    total = clients.size
    sent = 0
    
    puts "Processing #{total} unbilled clients"
    
    clients.each_with_index do |c, i|
      next if c.unsubbed_from? 'trial_ends_notification'
      
      if c.trial_days_left <= 0
        ClientNotifier.deliver_trial_ended_notification c
        puts "-----> (#{sprintf "%.2f", ((sent+1).to_f / total.to_f * 100)}% done) Sent ended notification. Days left: #{c.trial_days_left}, Client (#{c.id}) #{c.company} <#{c.email}>"
        
      elsif c.trial_days_left <= 15
        ClientNotifier.deliver_trial_ends_notification c
        puts "-----> (#{sprintf "%.2f", ((sent+1).to_f / total.to_f * 100)}% done) Sent ends notification. Days left: #{c.trial_days_left}, Client (#{c.id}) #{c.company} <#{c.email}>"
      end
      
      sent += 1
    end
    
    puts "Done. Sent to #{sent} clients"
  end
  
end