# Allow the metal piece to run in isolation
require(File.dirname(__FILE__) + "/../../config/environment") unless defined?(Rails)

class Rentalizer
  %w(erb cgi activerecord).each { |lib| require lib }
  dbconfig = YAML.load(File.read(File.dirname(__FILE__) + '/../../config/database.yml'))
  ActiveRecord::Base.establish_connection dbconfig['production']
  
  class << self
    def call(env)
      if env['PATH_INFO'] =~ /^\/rentalizer/
        params  = HashWithIndifferentAccess[*env['QUERY_STRING'].split(/&|=/).map { |q| CGI.unescape q }] # query string to hash
        listing = Listing.find params[:listing_id]
        size    = listing.sizes.find params[:size_id] if params[:size_id]
        
        out, mime = *(params.has_key?(:show_size_ops) ? rental_form(env, params, listing, size) : rental_calc(params, listing, size))
        
        [200, {'Content-Type' => mime}, [out]]
      else
        [404, {'Content-Type' => 'text/html'}, ['Not Found']]
      end
    end
    
    # read the rentalizer layout file, run it through erb and serve it up
    def rental_form(env, params, listing, size)
      html = File.read(File.dirname(__FILE__) + "/../views/rentals/rentalizer.html.erb")
      [ERB.new(html).result(binding), 'text/html']
    end
    
    # respond to ajax updates to the rentalizer form
    def rental_calc(params, listing, size)
      proration     = 0.03333 # multiply this by each day of the partial lastest month in a rental period
      special       = listing.predefined_specials.find params[:special_id] unless params[:special_id].blank?
      move_date     = Time.parse(CGI.unescape(params[:move_in_date]))
      days_in_month = Date.civil(move_date.year, move_date.month, -1).day
      half_month    = (days_in_month / 2).to_f.ceil
      multiplier    = special ? special.month_limit : 1 # the number of months required to rent 
      move_date     = Time.now if move_date < Time.now 
    
      if listing.prorated? 
        days_left = (days_in_month - move_date.day) == 0 ? 1 : (days_in_month - move_date.day)
        multiplier += days_left * proration
        multiplier += 1 if special && special.month_limit == 1 && move_date.day > half_month
      else
        multiplier += 1 if special && multiplier == 1
      end
    
      subtotal = size.dollar_price
      usssl_discount = subtotal * 0.10
    
      discount = if special
  	  	case special.function when 'm' # months off
  	  	    subtotal * special.value.to_f
    		  when '%' # percent off
    		    (subtotal * special.month_limit) * (special.value.to_f / 100)
    		  else # fixed dollar amount off
    		    special.value.to_f
  		  end
  	  else # no discount
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