# Allow the metal piece to run in isolation
require(File.dirname(__FILE__) + "/../../config/environment") unless defined?(Rails)

class Prorater
  def self.call(env)
    if env['PATH_INFO'] =~ /^\/prorater/
      require 'cgi'
      
      prorate       = 0.03333 # secret sauce
      hash          = Hash[*env['QUERY_STRING'].split(/&|=/)] # query string to hash
      multiplier    = hash['multiplier'].to_i
      move_date     = Time.parse(CGI.unescape(hash['move_date']))
      days_in_month = Date.civil(move_date.year, move_date.month, -1).day
      half_month    = (days_in_month / 2).to_f.ceil
      
      if multiplier > 1 
        multiplier -= 1
        multiplier += (days_in_month - move_date.day) * prorate
      else
        multiplier = (days_in_month - move_date.day) * prorate
      end
      
      hash['multiplier'] = multiplier
      
      [200, {'Content-Type' => 'application/json'}, [{ 'multiplier' => sprintf("%.2f", multiplier) }.to_json]]
    else
      [404, {'Content-Type' => 'text/html'}, ['Not Found']]
    end
  end
end
