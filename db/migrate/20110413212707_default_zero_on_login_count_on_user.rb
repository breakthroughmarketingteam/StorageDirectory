class DefaultZeroOnLoginCountOnUser < ActiveRecord::Migration
  def self.up
    puts '-----> Caching users'
    users = User.all
    count = users.size
    puts "-----> Cached #{count} users"
    
    users.each_with_index do |user, i|
      user.update_attribute :login_count, 0 if user.login_count.nil?
      user.update_attribute :failed_login_count, 0 if user.failed_login_count.nil?
      
      puts "-----> #{sprintf("%.2f", (i.to_f / count.to_f * 100))}% done. updated user #{user.id}"
    end
    
    puts "DONE"
  end

  def self.down
  end
end
