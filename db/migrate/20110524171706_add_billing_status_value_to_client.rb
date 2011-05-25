class AddBillingStatusValueToClient < ActiveRecord::Migration
  def self.up
    puts "Caching clients..."
    clients = Client.all
    total = clients.size
    puts "Updating Billing Status on #{total} clients..."
    
    clients.each_with_index do |c, i|
      c.billing_status = 'free'
      c.save
      puts "-----> (#{sprintf "%.2f", ((i+1).to_f / total.to_f * 100)}% done) Updated client #{c.id}"
    end
    
    puts "Done.\n"
  end

  def self.down
  end
end
