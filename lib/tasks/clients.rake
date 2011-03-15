namespace :clients  do
  
  desc "activate new clients"
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
      puts "-----> Activated client #{c.name}. Email: #{c.email} Password: #{c.temp_password}"
    end
    
    puts "\nDONE\n\n"
  end
end
