# Allow the metal piece to run in isolation
require(File.dirname(__FILE__) + "/../../config/environment") unless defined?(Rails)

class Rentalizer
  class << self
    def call(env)
      if env['PATH_INFO'] =~ /^\/rentalizer/
        require 'cgi'
        require 'activerecord'
        dbconfig = YAML.load(File.read(File.dirname(__FILE__) + '/../../config/database.yml'))
        ActiveRecord::Base.establish_connection dbconfig['production']
        
        hash    = HashWithIndifferentAccess[*env['QUERY_STRING'].split(/&|=/).map { |q| CGI.unescape q }] # query string to hash
        listing = Listing.find hash[:listing_id]
        size    = listing.sizes.find hash[:size_id] if hash[:size_id]
      
        out, mime = *(hash.has_key?(:show_size_ops) ? rental_form(env, hash, listing, size) : rental_calc(hash, listing, size))
        
        [200, {'Content-Type' => mime}, [out]]
      else
        [404, {'Content-Type' => 'text/html'}, ['Not Found']]
      end
    end
  
    def rental_form(env, hash, listing, size)
      require 'erb'
      
      html = File.read(File.dirname(__FILE__) + "/../views/rentals/rentalizer.html.erb")
      out = ERB.new(html).result(binding)
      
      [out, 'text/html']
    end
  
    def rental_calc(hash, listing, size)
      proration     = 0.03333
      special       = listing.predefined_specials.find hash[:special_id] unless hash[:special_id].blank?
      move_date     = Time.parse(CGI.unescape(hash[:move_in_date]))
      days_in_month = Date.civil(move_date.year, move_date.month, -1).day
      half_month    = (days_in_month / 2).to_f.ceil
      multiplier    = special ? special.month_limit : 1
      move_date     = Time.now if move_date < Time.now
    
      if listing.prorated? 
        days_left = (days_in_month - move_date.day) == 0 ? 1 : (days_in_month - move_date.day)
        multiplier += days_left * proration
        multiplier += 1 if special && special.month_limit == 1 && move_date.day > half_month
      else
        multiplier += 1 if special && multiplier == 1
      end
    
      subtotal = size.dollar_price
      usssl_discount = 0.10 * subtotal
    
      discount = if special
  	  	case special.function when 'm' 
  	  	    subtotal * special.value.to_f
    		  when '%'
    		    (subtotal * special.month_limit) * (special.value.to_f / 100)
    		  else 
    		    special.value.to_f
  		  end
  	  else
  	    0.00
    	end

  		discount *= multiplier if (multiplier > 0.5 && multiplier <= 1) 
      subtotal =  multiplier * size.dollar_price
      total    = listing.admin_fee + subtotal - (discount + usssl_discount)
      tax      = total * listing.tax_rate
      total    += tax
    
      out = {
        :paid_thru      => Time.local(move_date.year, move_date.month + multiplier, days_in_month - 1).strftime('%m/%d/%Y'),
        :multiplier     => sprintf("%.2f", multiplier),
        :month_rate     => size.dollar_price,
        :discount       => sprintf("%.2f", discount),
        :usssl_discount => sprintf("%.2f", usssl_discount),
        :subtotal       => sprintf("%.2f", subtotal),
        :admin_fee      => sprintf("%.2f", listing.admin_fee),
        :tax_amt        => sprintf("%.2f", tax),
        :total          => sprintf("%.2f", total)
      }
    
      [{ :success => true, :data => out }.to_json, 'application/json']
    end
  end
end