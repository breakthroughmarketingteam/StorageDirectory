class AddTrialDaysColumnToUser < ActiveRecord::Migration
  def self.up
    add_column :users, :trial_days, :integer
    
    puts "Caching clients"
    clients = Client.all
    total = clients.size
    
    puts "Adding trials days to #{total} clients"
    clients.each_with_index do |c, i|
      if c.created_at <= Time.utc(2011, 3, 25)
        c.trial_days = 90
      else
        c.trial_days = 60
      end
      
      c.save
      puts "-----> (#{sprintf "%.2f", ((i+1).to_f / total.to_f * 100)}% done) updated client #{c.id} days: #{c.trial_days}"
    end
    
    puts "Done.\n"
  end

  def self.down
    remove_column :users, :trial_days
  end
end
