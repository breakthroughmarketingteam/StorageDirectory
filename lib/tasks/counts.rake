namespace :counts do 
  
  desc "returns a list with the cities that have the most active listings"
  task :cities => :environment do
    plain = ''; html = '<ul>'; totes = 0
    listings = Listing.all :conditions => { :status => 'verified' }, :select => 'count(id) as count, city, state', :group => 'city, state', :order => 'count DESC'
    listings.each do |l|
      totes += l.count.to_i
      str = "(#{l.count}) #{l.city}, #{l.state}"
      plain << str
      html << "<li>#{str}</li>"
    end
    
    fstr = "\nTotal: #{totes}"
    plain << fstr
    html << "</ul>#{fstr}"
    Notifier.deliver_top_cities_list out
    
    puts out
  end
  
  desc "returns a list with the cities that have the most active listings"
  task :stats => :environment do
    counts = {}; out = "\n"
    stats_classes = [PhoneView, Click, Impression]
    
    stats_classes.each do |s|
      internal = s.count(:conditions => ['remote_ip = ?', '65.83.183.146'])
      external = s.count(:conditions => ['remote_ip != ?', '65.83.183.146'])
      total    = internal + external
      
      counts.store s.name, {
        :internal    => internal,
        :external    => external,
        :total       => total,
        :percent_in  => sprintf("%.2f", (internal.to_f / total.to_f * 100)),
        :percent_out => sprintf("%.2f", (external.to_f / total.to_f * 100))
      }
    end
    
    puts counts.inspect.gsub(/,\s?/, ",\n")
  end

  
end