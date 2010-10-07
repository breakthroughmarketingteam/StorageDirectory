require "lib/GoToBillingLibrary.rb"
include GoToBillingLibrary

# Test our plugin class.
gotob = GoToBilling.new

# Required Fields
gotob.SetMerchantId("234568")						# REQUIRED: Enter your merchant ID
gotob.SetMerchantPin("234568")					# REQUIRED: Enter your merchant Pin
gotob.SetIpAddress("65.83.183.146")			# REQUIRED: Pass in your internet facing IP Address

# Make this a debug transaction
gotob.SetDebug("1")											# OPTIONAL: A 1 or 0 (1 = on)

gotob.SetCustomerId( '1234-54' )				# REQUIRED: A unique Customer Identification specified by you
gotob.SetCompany( 'Test Company' )			# CONDITIONAL: Either the First and Last name or Company name must be specified
gotob.SetFirstName( 'Ester' )						# CONDITIONAL: Either the First and Last name or Company name must be specified
gotob.SetLastName( 'Tester' )						# CONDITIONAL: Either the First and Last name or Company name must be specified
gotob.SetAddress1( '123 main St.' )			# OPTIONAL
gotob.SetCity( 'Somewhere' )						# OPTIONAL
gotob.SetState( 'ST' )									# OPTIONAL
gotob.SetZipCode( '12345' )							# OPTIONAL
gotob.SetCountry( 'US' )								# OPTIONAL
gotob.SetPhone( '123-555-1234' )				# OPTIONAL
gotob.SetEmail( 'email@domain.com' )		# OPTIONAL
gotob.SetTransactionType( 'AS' )				# REQUIRED: For CC: AS, DS, ES, CR, VO   For ACH: DH, DC   Other: RM
gotob.SetInvoiceId( '1234564' )					# REQUIRED: A unique ID field specified by you
gotob.SetAmount( '12.56' )							# REQUIRED
gotob.SetProcessDate( "20080202" )			# OPTIONAL: Pass a date in YYYYMMDD format
	
gotob.SetCcName( 'Ester Tester' )				# OPTIONAL
gotob.SetCcType( 'VS' )									# OPTIONAL: VS, MC, AX, DC
gotob.SetCcNumber( '4111111111111111' )	# REQUIRED for CC Transactions
gotob.SetCcExpiration( '0112' )					# REQUIRED for CC Transactions
gotob.SetCcVerification( '135' )				# OPTIONAL

gotob.SetNotes( 'Notes Field Data' )		# OPTIONAL
gotob.SetMemo( 'Memo Field Data' )			# OPTIONAL

gotob.SetOccurrenceType( "month" )			# OPTIONAL: week, biweek, month, bimonth, semiannual, annual
gotob.SetOccurrenceNumber( "3" )				# OPTIONAL

# Retrieve the information being sent to the server.
puts gotob.GetUrlData

# Process our data
gotob.process

# Get our response and status
puts gotob.GetGatewayResponseXml
puts "Status: " + gotob.GetStatus
puts "Termination Code: " + gotob.GetTerminationCode
puts "Transaction Time: " + gotob.GetTransactionTime
puts "Transaction Date: " + gotob.GetTransactionDate
puts "Order Number: " + gotob.GetOrderNumber
puts "Invoice Id: " + gotob.GetReturnedInvoiceId
puts "Termination Description: " + gotob.GetTerminationDescription
puts "Termination Code: " + gotob.GetTerminationCode
puts "Transaction Amount: " + gotob.GetTransactionAmount