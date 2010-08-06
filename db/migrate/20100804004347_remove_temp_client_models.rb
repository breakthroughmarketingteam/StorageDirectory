class RemoveTempClientModels < ActiveRecord::Migration
  def self.up
    puts "Getting users..."
    User.find_each do |user|
      if user.name =~ /^(Client-\d*)$/
        puts "found user: #{user.id} - #{user.name}"
        listings = Listing.find_all_by_user_id(user.id)
        puts "found #{listings.size} related listings"
        listings.each { |listing| listing.update_attribute :user_id, nil }
        puts 'disassociated those listings'
        user.destroy
        puts "destroyed user #{user.id}"
      end
    end
  end

  def self.down
  end
end
