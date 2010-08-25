#------------------------------------------------------------
# GoToBilling Ruby on Rails Plugin v1.0
# Compatible with version 3.0.2 of the GoToBilling Gateway
#------------------------------------------------------------

require 'net/http'
require 'net/https'
require 'cgi'

module GoToBillingLibrary
	class GoToBilling
		@gateway_server
		@gateway_page
		@gateway_response
	
		# MERCHANT VALIDATION
		@merchant_id
		@merchant_pin
		@ip_address
		@relay_url
		@relay_type
		@debug
		
		# CUSTOMER INFORMATION
		# required
		@customer_id
		# optional
		@company
		@first_name
		@last_name
		@address1
		@address2
		@city
		@state
		@zip
		@country
		@phone
		@email
		
	
		# BASIC TRANSACTION INFORMATION
		# required
		@transaction_type
		@invoice_id
		@amount
		# optional
		@process_date
		@memo
		@notes
		@occurrence_type
		@occurrence_number
	
		# CREDIT CARD SPECIFIC
		# required
		@cc_number
		@cc_exp
		#optional
		@cc_name
		@cc_type
		@cc_cvv
		@authorization
	
		# ACH SPECIFIC
		# required
		@ach_payment_type
		@ach_route
		@ach_account
		@ach_account_type
		# optional
		@ach_serial
		@arc_image
		@ach_verification
	
		# Set defaults for the class.
		def initialize
			@gateway_server = "secure.gotobilling.com"
			@gateway_page = "/os/system/gateway/transact.php"
			@gateway_response = nil
			@merchant_id = nil
			@merchant_pin = nil
			@ip_address = nil
			@relay_url = nil
			@relay_type = nil
			@debug = "0"
			@customer_id = nil
			@company = nil
			@first_name = nil
			@last_name = nil
			@address1 = nil
			@address2 = nil
			@city = nil
			@state = nil
			@zip = nil
			@country = nil
			@phone = nil
			@email = nil
			@transaction_type = nil
			@invoice_id = nil
			@amount = nil
			@process_date = nil
			@memo = nil
			@notes = nil
			@occurrence_type = nil
			@occurrence_number = nil
			@cc_number = nil
			@cc_exp = nil
			@cc_name = nil
			@cc_type = nil
			@cc_cvv = nil
			@authorization = nil
			@ach_payment_type = nil
			@ach_route = nil
			@ach_account = nil
			@ach_account_type = nil
			@ach_serial = nil
			@arc_image = nil
			@ach_verification = nil
		end
	
		# Set and Retrieve Merchant Information
		def SetMerchantId(merchant_id)
			@merchant_id = CGI.escape(merchant_id)
		end
	
		def GetMerchantId
			return @merchant_id
		end
	
		def SetMerchantPin(merchant_pin)
			@merchant_pin = CGI.escape(merchant_pin)
		end
	
		def GetMerchantPin
			return @merchant_pin
		end
	
		def SetIpAddress(ip_address)
			@ip_address = CGI.escape(ip_address)
		end
	
		def GetIpAddress
			return @ip_address
		end
	
		def SetRelayUrl(relay_url)
			@relay_url = CGI.escape(relay_url)
		end
	
		def GetRelayUrl
			return @relay_url
		end
	
		def SetRelayType(relay_type)
			@relay_type = CGI.escape(relay_type)
		end
	
		def GetRelayType
			return @relay_type
		end
	
		def SetDebug(debug)
			@debug = CGI.escape(debug)
		end
	
		def GetDebug
			return @debug
		end
	
		
		# Get and Set CUSTOMER INFORMATION
	
		def SetCustomerId(customer_id)
			@customer_id = CGI.escape(customer_id)
		end
	
		def GetCustomerId
			return @customer_id
		end
	
		def SetFirstName(first_name)
			@first_name = CGI.escape(first_name)
		end
	
		def GetFirstName
			return @first_name
		end
	
		def SetCompany(company)
			@company = CGI.escape(company)
		end
	
		def GetCompany
			return @company
		end
	
		def SetLastName(last_name)
			@last_name = CGI.escape(last_name)
		end
	
		def GetLastName
			return @last_name
		end
	
		def SetAddress1(address1)
			@address1 = CGI.escape(address1)
		end
	
		def GetAddress1
			return @address1
		end
	
		def SetAddress2(address2)
			@address2 = CGI.escape(address2)
		end
	
		def GetAddress2
			return @address2
		end
	
		def SetCity(city)
			@city = CGI.escape(city)
		end
	
		def GetCity
			return @city
		end
	
		def SetState(state)
			@state = CGI.escape(state)
		end
	
		def GetState
			return @state
		end
	
		def SetZipCode(zip)
			@zip = CGI.escape(zip)
		end
	
		def GetZipCode
			return @zip
		end
	
		def SetCountry(country)
			@country = CGI.escape(country)
		end
	
		def GetCountry
			return @country
		end
	
		def SetPhone(phone)
			@phone = CGI.escape(phone)
		end
	
		def GetPhone
			return @phone
		end
	
		def SetEmail(email)
			@email = CGI.escape(email)
		end
	
		def GetEmail
			return @email	
		end
	
	
		# Get or Set TRANSACTION INFORMATION
	
		def SetTransactionType(transaction_type)
			@transaction_type = CGI.escape(transaction_type)
		end
	
		def GetTransactionType
			return @transaction_type	
		end
	
		def SetInvoiceId(invoice_id)
			@invoice_id = CGI.escape(invoice_id)
		end
	
		def GetInvoiceId
			return @invoice_id	
		end
	
		def SetAmount(amount)
			@amount = CGI.escape(amount)
		end
	
		def GetAmount
			return @amount	
		end
	
		def SetProcessDate(process_date)
			@process_date = CGI.escape(process_date)
		end
	
		def GetProcessDate
			return @process_date	
		end
	
		def SetMemo(memo)
			@memo = CGI.escape(memo)
		end
	
		def GetMemo
			return @memo	
		end
	
		def SetNotes(notes)
			@notes = CGI.escape(notes)
		end
	
		def GetNotes
			return @notes	
		end
	
		def SetOccurrenceType(occurrence_type)
			@occurrence_type = CGI.escape(occurrence_type)
		end
	
		def GetOccurrenceType
			return @occurrence_type	
		end
	
		def SetOccurrenceNumber(occurrence_number)
			@occurrence_number = CGI.escape(occurrence_number)
		end
	
		def GetOccurrenceNumber
			return @occurrence_number	
		end
	
	
		# Get or Set CREDIT CARD INFORMATION
		
		def SetCcNumber(cc_number)
			@cc_number = CGI.escape(cc_number)
		end
	
		def GetCcNumber
			return @cc_number	
		end
	
		def SetCcExpiration(cc_exp)
			@cc_exp = CGI.escape(cc_exp)
		end
	
		def GetCcExpiration
			return @cc_exp	
		end
	
		def SetCcName(cc_name)
			@cc_name = CGI.escape(cc_name)
		end
	
		def GetCcName
			return @cc_name	
		end
	
		def SetCcType(cc_type)
			@cc_type = CGI.escape(cc_type)
		end
	
		def GetCcType
			return @cc_type	
		end
	
		def SetCcVerification(cc_cvv)
			@cc_cvv = CGI.escape(cc_cvv)
		end
	
		def GetCcVerification
			return @cc_cvv	
		end
	
		def SetAuthorization(authorization)
			@authorization = CGI.escape(authorization)
		end
	
		def GetAuthorization
			return @authorization	
		end
	
	
		# Get or Set ACH INFORMATION
			
		def SetAchPaymentType(ach_payment_type)
			@ach_payment_type = CGI.escape(ach_payment_type)
		end
	
		def GetAchPaymentType
			return @ach_payment_type	
		end
	
		def SetAchRoute(ach_route)
			@ach_route = CGI.escape(ach_route)
		end
	
		def GetAchRoute
			return @ach_route	
		end
	
		def SetAchAccount(ach_account)
			@ach_account = CGI.escape(ach_account)
		end
	
		def GetAchAccount
			return @ach_account	
		end
	
		def SetAchAccountType(ach_account_type)
			@ach_account_type = CGI.escape(ach_account_type)
		end
	
		def GetAchAccountType
			return @ach_account_type	
		end
	
		def SetAchSerial(ach_serial)
			@ach_serial = CGI.escape(ach_serial)
		end
	
		def GetAchSerial
			return @ach_serial	
		end
	
		def SetArcImage(arc_image)
			@arc_image = CGI.escape(arc_image)
		end
	
		def GetArcImage
			return @arc_image	
		end
	
		def SetAchVerification(ach_verification)
			@ach_verification = CGI.escape(ach_verification)
		end
	
		def GetAchVerification
			return @ach_verification	
		end
	
		def GetUrlData
			data = "merchant_id=" +	@merchant_id
			data += "&merchant_pin=" + @merchant_pin
			data += "&ip_address="	 + @ip_address
			data += "&x_transaction_type=" + @transaction_type
			data += "&x_customer_id=" + @customer_id
			data += "&x_invoice_id=" + @invoice_id
			data += "&x_amount=" + @amount
	
			# optional
			if @debug!=nil then							data += "&x_debug="			 					+ @debug end
			if @company!=nil then						data += "&x_company="			 				+ @company end
			if @first_name!=nil then				data += "&x_first_name="		 			+ @first_name end
			if @last_name!=nil then					data += "&x_last_name="		 				+ @last_name end
			if @address1!=nil then					data += "&x_address1="			 			+ @address1 end
			if @address2!=nil then					data += "&x_address2="			 			+ @address2 end
			if @city!=nil then							data += "&x_city="				 				+ @city end
			if @state!=nil then							data += "&x_state="			 					+ @state end
			if @zip!=nil then								data += "&x_zip="				 					+ @zip end
			if @country!=nil then						data += "&x_country="			 				+ @country end
			if @phone!=nil then							data += "&x_phone="			 					+ @phone end
			if @email!=nil then							data += "&x_email="			 					+ @email end
			if @process_date!=nil then			data += "&x_process_date="		 		+ @process_date end
			if @cc_name!=nil then						data += "&x_cc_name="			 				+ @cc_name end
			if @cc_number!=nil then					data += "&x_cc_number="		 				+ @cc_number end
			if @cc_exp!=nil then						data += "&x_cc_exp="			 				+ @cc_exp end
			if @cc_type!=nil then						data += "&x_cc_type="			 				+ @cc_type end
			if @cc_cvv!=nil then						data += "&x_cc_cvv="			 				+ @cc_cvv end
			if @authorization!=nil then			data += "&x_authorization="	 			+ @authorization end
			if @ach_payment_type!=nil then	data += "&x_ach_payment_type="	 	+ @ach_payment_type end
			if @ach_route!=nil then					data += "&x_ach_route="						+ @ach_route end
			if @ach_account!=nil then				data += "&x_ach_account="		 			+ @ach_account end
			if @ach_account_type!=nil then	data += "&x_ach_account_type="	 	+ @ach_account_type end
			if @ach_serial!=nil then				data += "&x_ach_serial="		 			+ @ach_serial end
			if @arc_image!=nil then					data += "&x_arc_image="		 				+ @arc_image end
			if @ach_verification!=nil then	data += "&x_ach_verification="	 	+ @ach_verification end
			if @notes!=nil then							data += "&x_notes="			 					+ @notes end
			if @memo!=nil then							data += "&x_notes="			 					+ @memo end
			if @occurrence_type!=nil then		data += "&x_occurrence_type="	 		+ @occurrence_type end
			if @occurrence_number!=nil then	data += "&x_occurrence_number=" 	+ @occurrence_number end
			if @relay_url!=nil then					data += "&x_relay_url="		 				+ @relay_url end
			if @relay_type!=nil then				data += "&x_relay_type="		 			+ @relay_type end
	
	    return data
		end
	
		# Send the data to Gotobilling and Retrieve the results
		def process
			http = Net::HTTP.new(@gateway_server, 443)
			http.use_ssl = true
			resp, body = http.post(@gateway_page, GetUrlData())
			@gateway_response = body		
			
			return true
		end
		
		def GetGatewayResponseXml
			return @gateway_response
		end
		
		def GetAuthCode
			data = @gateway_response
			my_val = data.scan(/<auth_code>(.*)<\/auth_code>/)
			if my_val.size > 0
				if my_val[0].size > 0
					return my_val[0][0]
				end
			end
			
			return ""
		end
		
		def GetStatus
			data = @gateway_response
			my_val = data.scan(/<status>(.*)<\/status>/)
			if my_val.size > 0
				if my_val[0].size > 0
					return my_val[0][0]
				end
			end
			
			return ""
		end
		
		def GetOrderNumber
			data = @gateway_response
			my_val = data.scan(/<order_number>(.*)<\/order_number>/)
			if my_val.size > 0
				if my_val[0].size > 0
					return my_val[0][0]
				end
			end
			
			return ""
		end
		
		def GetTerminationCode
			data = @gateway_response
			my_val = data.scan(/<term_code>(.*)<\/term_code>/)
			if my_val.size > 0
				if my_val[0].size > 0
					return my_val[0][0]
				end
			end
			
			return ""
		end
		
		def GetTransactionDate
			data = @gateway_response
			my_val = data.scan(/<tran_date>(.*)<\/tran_date>/)
			if my_val.size > 0
				if my_val[0].size > 0
					return my_val[0][0]
				end
			end
			
			return ""
		end
		
		def GetTransactionTime
			data = @gateway_response
			my_val = data.scan(/<tran_time>(.*)<\/tran_time>/)
			if my_val.size > 0
				if my_val[0].size > 0
					return my_val[0][0]
				end
			end
			
			return ""
		end
		
		def GetTransactionAmount
			data = @gateway_response
			my_val = data.scan(/<tran_amount>(.*)<\/tran_amount>/)
			if my_val.size > 0
				if my_val[0].size > 0
					return my_val[0][0]
				end
			end
			
			return ""
		end
		
		def GetReturnedInvoiceId
			data = @gateway_response
			my_val = data.scan(/<invoice_id>(.*)<\/invoice_id>/)
			if my_val.size > 0
				if my_val[0].size > 0
					return my_val[0][0]
				end
			end
			
			return ""
		end
		
		def GetTerminationDescription
			data = @gateway_response
			my_val = data.scan(/<description>(.*)<\/description>/)
			if my_val.size > 0
				if my_val[0].size > 0
					return my_val[0][0]
				end
			end
			
			return ""
		end
	end
end
