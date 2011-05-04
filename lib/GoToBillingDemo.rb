require 'lib/GoToBillingLibrary.rb'

# Test our plugin class.
gotob = GoToBilling.new

# Make this a debug transaction
gotob.merchant_info({
  :merchant_id  => '234568',       # REQUIRED: Enter your merchant ID
  :merchant_pin => '234568',       # REQUIRED: Enter your merchant Pin
  :ip_address  => '65.83.183.146', # REQUIRED: Pass in your internet facing IP Address
  :debug       => '1'             # OPTIONAL: A 1 or 0 (1 = on)
})

gotob.customer_info({
  :customer_id => '1234-54',          # REQUIRED: A unique Customer Identification specified by you
  :first_name  => 'Ester',            # CONDITIONAL: Either the First and Last name or Company name must be specified
  :last_name   => 'Tester',           # CONDITIONAL: Either the First and Last name or Company name must be specified
  :company     => 'Test Company',     # CONDITIONAL: Either the First and Last name or Company name must be specified
  :address     => '123 main St.',     # OPTIONAL
  :city        => 'Somewhere',        # OPTIONAL
  :state       => 'FL',               # OPTIONAL
  :zip         => '33133',            # OPTIONAL
  :country     => 'US',               # OPTIONAL
  :phone       => '555-123-1234',     # OPTIONAL
  :email       => 'email@domain.com'  # OPTIONAL
})	

gotob.transaction_info({
  :transaction_type  => 'AS',                   # REQUIRED: For CC: AS, DS, ES, CR, VO   For ACH: DH, DC   Other: RM
  :invoice_id        => '123456',               # REQUIRED: A unique ID field specified by you
  :amount            => '12.56',                # REQUIRED
  :process_date      => '20110501',             # OPTIONAL: Pass a date in YYYYMMDD format
  :memo              => 'This might be a memo', # OPTIONAL
  :notes             => 'This might be a note', # OPTIONAL
  :occurrence_type   => 'month',                # OPTIONAL: week, biweek, month, bimonth, semiannual, annual
  :occurrence_number => '3'                     # OPTIONAL
})

gotob.card_info({
  :cc_number => '6011000000000012', # REQUIRED for CC Transactions
  :cc_exp    => '0112',             # REQUIRED for CC Transactions
  :cc_name   => 'Ester Tester',     # OPTIONAL
  :cc_type   => 'VS',               # OPTIONAL: VS, MC, AX, DC
  :cc_cvv    => '123'               # OPTIONAL
})					

# Retrieve the information being sent to the server.
puts gotob.url_data

# Process our data
gotob.process

# Get our response and status
response = gotob.response_info
puts 'Status:                  ' + response[:status]
puts 'Transaction Time:        ' + response[:tran_time]
puts 'Transaction Date:        ' + response[:tran_date]
puts 'Order Number:            ' + response[:order_number]
puts 'Invoice Id:              ' + response[:invoice_id]
puts 'Termination Description: ' + response[:description]
puts 'Termination Code:        ' + response[:term_code]
puts 'Authorization Code:      ' + response[:auth_code]
puts 'Transaction Amount:      ' + response[:tran_amount]