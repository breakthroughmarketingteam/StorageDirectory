# Uncle Bob's XML Feed API wrapper
# 2011 Diego Salazar
#
class UncleBobsFeed
  %w(uri net/http cobravsmongoose cgi).map { |lib| require lib }
  @@host             = 'www.unclebobs.com'
  @@path             = '/XMLFeeds/usselfstoragelocator/'
  @@location_feed    = 'stores.cfm'
  @@inventory_feed   = 'index.cfm'
  @@reservation_feed = 'reserve.cfm'
  
  def initialize
    
  end
  
  def get_xml(feed)
    uri      = URI.parse(@@host + @@path + feed)
    http     = Net::HTTP.new(uri.host, uri.port)
    full_url = @@host + uri.path + path_str(method, query)
    response = http.start { |h| h.get full_url }
    puts response.body
  end
end