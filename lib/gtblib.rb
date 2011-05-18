#------------------------------------------------------------
# GoToBilling API Ruby Class
# 2011 (c) Diego Salazar diego@greyrobot.com
#------------------------------------------------------------
module GTBLib
  API_VERSION = '3.0.2' # GoToBilling API
  VERSION     = '1.1'
  DATE        = 'May, 2011'
  AUTHOR      = 'diego@greyrobot.com'
	class GTB
	  ['net/https', 'cgi'].map { |m| require m }
	  
	  @@query_names = %w(transaction_type customer_id invoice_id amount debug company first_name last_name address1 address2 city state zip country phone email process_date cc_name cc_number cc_exp cc_type cc_cvv authorization ach_payment_type ach_route ach_account ach_account_type ach_serial arc_image ach_verification notes memo occurrence_type occurrence_number relay_url relay_type)
	  @@merchant_fields    = %w(merchant_id merchant_pin ip_address relay_url relay_type debug)
	  @@customer_fields    = %w(customer_id first_name last_name company address address2 city state zip country phone email)
	  @@transaction_fields = %w(transaction_type invoice_id amount process_date memo notes occurrence_type occurrence_number)
	  @@card_fields        = %w(cc_number cc_exp cc_name cc_type cc_cvv authorization)
	  @@ach_fields         = %w(ach_payment_type ach_route ach_account ach_account_type ach_serial arc_image ach_verification)
	  @@response_fields    = %w(auth_code status order_number term_code tran_date tran_time tran_amount invoice_id description)
	  
		def initialize(settings = {})
		  @debug            = settings[:debug] || '0'
			@gateway_server   = settings[:server]       || 'secure.gotobilling.com'
			@gateway_page     = settings[:page]         || '/os/system/gateway/transact.php'
			@ip_address       = settings[:ip_address]   || '65.83.183.146'
			@merchant_id      = settings[:merchant_id]  || '234568' # default to test account
			@merchant_pin     = settings[:merchant_pin] || '234568' # default to test account
			@merchant_info    = {}
			@customer_info    = {}
			@transaction_info = {}
			@card_info        = {}
			@ach_info         = {}
			@response_info    = {}
      @query_attributes = {}
		end
		
		def merchant_info(info = nil)
		  get_or_set :merchant, info
    end
		
		def customer_info(info = nil)
	    get_or_set :customer, info
    end
	  
		def transaction_info(info = nil)
	    get_or_set :transaction, info
    end
	  
	  def card_info(info = nil)
	    get_or_set :card, info
    end
	  
		def ach_info(info = nil)
		  get_or_set :ach, info
	  end
	  
		def response_info
		  @@response_fields.each do |name|
		    @response_info[name.to_sym] = get_response_val name, @gateway_response
	    end
	    @response_info
	  end
	  
	  def url_data
			data =  'merchant_id='   + @merchant_id
			data << '&merchant_pin=' + @merchant_pin
			data << '&ip_address='	 + @ip_address
			
			# optional values, we're also adding the x_ prefix to the query names
			query_attributes.each_pair do |name, val|
			  data << "&x_#{name}=#{val}" unless val.nil?
		  end
		  
		  # developer info
		  data << '&x_source_description=' + CGI.escape("GTBLib v#{GTBLib::VERSION} API v#{GTBLib::API_VERSION}")
		  data << '&x_module_description=' + CGI.escape("#{GTBLib::DATE} by #{GTBLib::AUTHOR}")
	    data
		end
	
		# Send the data to Gotobilling and Retrieve the results
		def process
			http = Net::HTTP.new @gateway_server, 443
			http.use_ssl = true
			resp, body = http.post(@gateway_page, url_data)
			@gateway_response = body		
			true
		end
		
		private
		
		def get_or_set(what, info = nil)
      fields = eval "@@#{what}_fields"
      attrib = instance_variable_get "@#{what}_info"
      
      fields.each do |name|
        if info.nil? # get
          attrib[name] = instance_variable_get "@#{name}"
        elsif info[name.to_sym] # set
          instance_variable_set "@#{name}", CGI.escape(info[name.to_sym])
        end
      end
      attrib
    end
	  
	  def query_attributes
			@@query_names.each do |name|
			  @query_attributes[name.to_sym] = instance_variable_get "@#{name}"
		  end
		  @query_attributes
    end
    
    def get_response_val(name, data)
	    val = data.scan /<#{name}>(.*)<\/#{name}>/
			(val.size > 0 && val[0].size > 0) ? val[0][0] : ''
    end
		
	end
end
include GTBLib