class AddHintsToExistingUsers < ActiveRecord::Migration
  def self.up
    puts "caching hints"
    hints = UserHint.all
    
    Client.find_each do |client|
      client.user_hints << hints
      client.save
      puts "added hints to client: #{client.name}"
    end
  end

  def self.down
  end
end
