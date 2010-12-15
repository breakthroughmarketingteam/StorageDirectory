namespace :user_hints  do
  
  desc "Re add user_hints to the client models"
  task :add_to_clients => :environment do
    puts 'Caching user_hint and client models...'
    
    @user_hints = UserHint.all
    @clients = Client.all
    
    puts 'done.'
    
    @clients.each do |client|
      client.user_hints = @user_hints
      client.save
      puts "Added user_hints to client #{client.id}"
    end
    
    puts "DONE"
  end
end
