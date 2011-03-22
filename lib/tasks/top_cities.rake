namespace :counts do 
  
  desc "returns a list with the cities that have the most active listings"
  task :top_active_cities => :environment do
    l = Listing.all :conditions => { :status => 'verified' }, :select => 'id, city, state, status'
    c = l.map { |i| "#{i.city.titleize},#{i.state.upcase}" }.uniq
    m = c.map { |i| cs = i.split(','); l.select { |x| x.city =~ /(#{cs[0]})/i && x.state =~ /(#{cs[1]})/i } }.map { |i| i.select { |n| n.status == 'verified' } }.reject &:empty?
    
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