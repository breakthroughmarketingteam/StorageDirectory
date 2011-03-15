namespace :raffle  do
  
  desc "Draw a random active client"
  task :draw => :environment do
    puts 'Caching active client models...'
    @clients = Client.activated
    puts "Done.\nAnd the winner is..."
    
    @winner = @clients[rand(@clients.size)]
    
    puts "#{@winner.name} of #{@winner.company} account number #{@winner.id}"
  end
end
