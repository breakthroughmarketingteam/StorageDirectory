# Allow the metal piece to run in isolation
require(File.dirname(__FILE__) + "/../../config/environment") unless defined?(Rails)

class Rentalizer
  %w(erb cgi activerecord).each { |lib| require lib }
  dbconfig = YAML.load(File.read(File.dirname(__FILE__) + '/../../config/database.yml'))
  ActiveRecord::Base.establish_connection dbconfig['production']
  
  class << self
    def call(env)
      if env['PATH_INFO'] =~ /^\/rentalizer/
        params = HashWithIndifferentAccess[*CGI.unescape(env['QUERY_STRING']).split(/&|=/)] # query string to hash
        
        if params[:multi_params]
          # :multi_params are built like: <listing_id>x<size_id>x<special_id>-<listing_id 2>...
          data = params[:multi_params].split('-').map do |str|
            p = str.split('x')
            listing = Listing.find p[0].to_i
            size    = listing.sizes.find_by_id(p[1].to_i == 0 ? nil : p[1].to_i)
            special = listing.predefined_specials.find_by_id(p[2].to_i == 0 ? nil : p[2].to_i)
            
            rental_calc params, listing, size, special, true
          end
          
          out, mime = { :success => true, :data => data }.to_json, 'application/json'
        else  
          listing = Listing.find(params['rental[listing_id]'] || params[:listing_id])
          size    = listing.sizes.find_by_id(params[:size_id] || params['rental[size_id]'])
          special = listing.predefined_specials.find_by_id(params[:special_id] || params['rental[special_id]'])
        
          out, mime = *(params.has_key?(:show_size_ops) ? rental_form(env, params, listing, size, special) : rental_calc(params, listing, size, special))
        end
        
        [200, {'Content-Type' => mime}, [out]]
      else
        [404, {'Content-Type' => 'text/html'}, ['Not Found']]
      end
    end
    
    # read the rentalizer layout file, run it through erb and serve it up
    def rental_form(env, params, listing, size, special)
      html = File.read(File.dirname(__FILE__) + "/../views/rentals/rentalizer.html.erb")
      [ERB.new(html).result(binding), 'text/html']
    end
    
    # respond to ajax updates to the rentalizer form
    def rental_calc(params, listing, size, special, multi = false)
      proration     = 0.03333 # multiply this by each day left in the lastest month in the rental period
      move_date     = Time.parse(CGI.unescape(params['rental[move_in_date]'] || params[:move_in_date]))
      days_in_month = Date.civil(move_date.year, move_date.month, -1).day
      half_month    = (days_in_month / 2).to_f.ceil
      multiplier    = special ? special.month_limit : 1 # the number of months required to rent 
      move_date     = 1.day.from_now if move_date < Time.now
      subtotal      = size.dollar_price
      usssl_discount = subtotal * 0.10
      
      if listing.prorated? 
        days_left = (days_in_month - move_date.day) == 0 ? 1 : (days_in_month - move_date.day)
        multiplier += (days_left * proration) - (special && special.month_limit > 1 ? 1 : 0)
        multiplier += 1 if special && special.month_limit == 1 && move_date.day > half_month
        discount = calculate_special multiplier, special, subtotal
      elsif special && multiplier == 1
        multiplier += 1
        discount = calculate_special special.month_limit, special, subtotal
      else
        discount = 0.00
      end
      
  		discount *= multiplier if (multiplier > 0.5 && multiplier <= 1)
      subtotal =  multiplier * size.dollar_price
      total    = listing.admin_fee + subtotal - (discount + usssl_discount)
      tax_amt  = total * listing.tax_rate
      total    += tax_amt
      
      out = {
        :paid_thru      => Time.local(move_date.year, move_date.month + multiplier, days_in_month - 1).strftime('%m/%d/%Y'),
        :multiplier     => sprintf("%.2f", multiplier),
        :month_rate     => sprintf("%.2f", size.dollar_price),
        :discount       => sprintf("%.2f", discount),
        :usssl_discount => sprintf("%.2f", usssl_discount),
        :subtotal       => sprintf("%.2f", subtotal),
        :admin_fee      => sprintf("%.2f", listing.admin_fee),
        :tax_amt        => sprintf("%.2f", tax_amt),
        :total          => sprintf("%.2f", total)
      }
      
      multi ? { :listing_id => listing.id, :calculation => out } : [{ :success => true, :data => out }.to_json, 'application/json']
    end
    
    def calculate_special(multiplier, special, subtotal)
      if special
  	  	case special.function when 'm' # months off
  	  	    subtotal * special.value.to_f
    		  when '%' # percent off
    		    (subtotal * multiplier) * (special.value.to_f / 100)
    		  else # fixed dollar amount off
    		    special.value.to_f
  		  end
  	  else
  	    0.00
    	end
    end
    
  end
end