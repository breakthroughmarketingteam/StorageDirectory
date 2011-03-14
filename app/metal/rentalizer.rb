# Allow the metal piece to run in isolation
require(File.dirname(__FILE__) + "/../../config/environment") unless defined?(Rails)

class Rentalizer
  %w(erb cgi activerecord).each { |lib| require lib }
  dbconfig = YAML.load(File.read(File.dirname(__FILE__) + '/../../config/database.yml'))
  ActiveRecord::Base.establish_connection dbconfig['production']
  
  class << self
    def call(env)
      if env['PATH_INFO'] =~ /^\/rentalizer/
        params = HashWithIndifferentAccess[*split_query(env['QUERY_STRING'])] # query string to hash
        
        if params[:multi_params]
          # :multi_params are built like: <listing_id>x<size_id>x<special_id>-<listing_id 2>...
          data = params[:multi_params].split('-').map do |str|
            p = str.split('x')
            listing = Listing.find p[0].to_i
            size    = listing.sizes.find_by_id p[1].to_i
            special = listing.predefined_specials.find_by_id p[2].to_i
            
            begin
              rental_calc params, listing, size, special, true
            rescue => e
              puts mylogger(e.message)
              rental_calc params, listing, nil, nil, true
            end
          end
          
          out, mime = { :success => true, :data => data }.to_json, 'application/json'
        else  
          listing = Listing.find((params['rental[listing_id]'] || params[:listing_id]).to_i)
          size    = listing.sizes.find_by_id((params[:size_id] || params['rental[size_id]']).to_i)
          special = listing.predefined_specials.find_by_id((params[:special_id] || params['rental[special_id]']).to_i)
          
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
      if size
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
        elsif special
          multiplier += 1 if multiplier == 1
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
          :paid_thru      => get_paid_thru(listing, move_date, multiplier, special),
          :multiplier     => sprintf("%.2f", multiplier),
          :month_rate     => sprintf("%.2f", size.dollar_price),
          :discount       => sprintf("%.2f", discount),
          :usssl_discount => sprintf("%.2f", usssl_discount),
          :subtotal       => sprintf("%.2f", subtotal),
          :admin_fee      => sprintf("%.2f", listing.admin_fee),
          :tax_amt        => sprintf("%.2f", tax_amt),
          :total          => sprintf("%.2f", total)
        }
      else
        out = { :paid_thru => 'N/A', :multiplier => 0, :month_rate => 0, :discount => 0, :usssl_discount => 0, :subtotal => 0, :admin_fee => 0, :tax_amt => 0, :total => 0 }
      end
      
      multi ? { :listing_id => listing.id, :calculation => out } : [{ :success => true, :data => out }.to_json, 'application/json']
    end
    
    def calculate_special(multiplier, special, subtotal)
      return 0.00 unless special
    
	  	case special.function when 'm' # months off
	  	    subtotal * special.value.to_f
  		  when '%' # percent off
  		    (subtotal * multiplier) * (special.value.to_f / 100)
  		  else # fixed dollar amount off
  		    special.value.to_f
		  end
    end
    
    def get_paid_thru(listing, move_date, multiplier, special)
      months = special ? multiplier : (listing.prorated? ? 0 : multiplier)
      end_month = Time.local move_date.year, move_date.month + months
      days_in_end_month = Date.civil(end_month.year, end_month.month, -1).day
      
      if listing.prorated?
        Time.local(move_date.year, move_date.month + months, days_in_end_month).strftime('%m/%d/%Y')
      else
        Time.local(move_date.year, move_date.month + months, move_date.day - 1).strftime('%m/%d/%Y')
      end
    end
    
    # split the query adding blank values to the array where the query had nothing
    def split_query(query)
      query.split('&').map do |pairs|
        p = pairs.split('=')
        [CGI.unescape(p[0]), CGI.unescape(p[1] || '')]
      end.flatten
    end
    
  end
end