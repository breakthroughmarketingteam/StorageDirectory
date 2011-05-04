#------------------------------------------------------------
# GoToBilling Ruby on Rails Plugin v1.0
# Compatible with version 3.0.2 of the GoToBilling Gateway
#------------------------------------------------------------
module GoToBillingLibrary
	class GoToBilling
	  ['net/https', 'cgi'].map { |m| require m }
	  
	  @@query_names = %w(transaction_type customer_id invoice_id amount debug company first_name last_name address1 address2 city state zip country phone email process_date cc_name cc_number cc_exp cc_type cc_cvv authorization ach_payment_type ach_route ach_account ach_account_type ach_serial arc_image ach_verification notes memo occurrence_type occurrence_number relay_url relay_type).map { |n| "x_#{n}" }
	  @@merchant_fields    = %w(merchant_id merchant_pin ip_address relay_url relay_type debug)
	  @@customer_fields    = %w(customer_id first_name last_name company address address2 city state zip country phone email)
	  @@transaction_fields = %w(transaction_type invoice_id amount process_date memo notes occurrence_type occurrence_number)
	  @@card_fields        = %w(cc_number cc_exp cc_name cc_type cc_cvv authorization)
	  @@ach_fields         = %w(ach_payment_type ach_route ach_account ach_account_type ach_serial arc_image ach_verification)
	  @@response_fields    = %w(auth_code status order_number term_code tran_date tran_time tran_amount invoice_id description)
	  
		def initialize(server = 'secure.gotobilling.com', page = '/os/system/gateway/transact.php')
			@gateway_server   = server
			@gateway_page     = page
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
		    @response_info[name.to_sym] = get_response_val name
	    end
	    @response_info
	  end
	  
	  def url_data
			data =  'merchant_id='   + @merchant_id
			data << '&merchant_pin=' + @merchant_pin
			data << '&ip_address='	 + @ip_address
	
			# optional
			query_attributes.each_pair do |name, val|
			  data << "&#{name}=#{val}" unless val.nil?
		  end
	
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
		
		def get_or_set(what, info)
      fields = eval "@@#{what}_fields"
      attrib = instance_variable_get "@#{what}_info"
      
      fields.each do |name|
        if info.nil? # get
          attrib[name] = instance_variable_get "@#{name}"
        else # set
          instance_variable_set "@#{name}", CGI.escape(info[name.to_sym]) unless info[name.to_sym].nil?
        end
      end
      attrib
    end
	  
	  def query_attributes
			@@query_names.each do |name|
			  @query_attributes[name.to_sym] = instance_variable_get("@#{name.sub(/^(x_)/, '')}")
		  end
		  @query_attributes
    end
    
    def get_response_val(name)
	    val = @gateway_response.scan /<#{name}>(.*)<\/#{name}>/
			(val.size > 0 && val[0].size > 0) ? val[0][0] : ''
    end
		
	end
end
include GoToBillingLibrary