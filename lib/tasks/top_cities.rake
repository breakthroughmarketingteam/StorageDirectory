namespace :counts do 
  
  desc "returns a list with the cities that have the most active listings"
  task :top_active_cities => :environment do
    l = Listing.all :conditions => { :status => 'verified' }
    c = l.map{ |i| "#{i.city.titleize}, #{i.state.upcase}" }.uniq
    m = c.map { |i| Map.all :conditions => ['city ILIKE ?', "#{i.split(',')[0]}%"] }.map { |i| i.select { |n| n.listing.status == 'verified'} }
    cc = m.map { |i| "(#{i.size}) #{i.first.city}, #{i.first.state}" }
    ccc = cc.sort { |i| i.first.split(')')[0].sub('(', '').to_i <=> i.last.split(')')[0].sub('(','').to_i }.reverse
    
    out = ''
    ccc.each { |i| out << "#{i}\n" }
    totes = 0
    m.each { |i| totes += i.size }
    
    puts out
    puts totes
  end
  
end