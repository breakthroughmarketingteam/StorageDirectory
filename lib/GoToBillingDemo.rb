require 'lib/gtblib.rb'

# Test our plugin class.
gtb = GTB.new

# Make this a debug transaction
gtb.merchant_info({
  :ip_address  => '65.83.183.146', # REQUIRED: Pass in your internet facing IP Address
  :debug       => '0'              # OPTIONAL: A 1 or 0 (1 = on)
  :merchant_id => '236977',
  :merchant_pin => 'Qh3Q3jxVtaZg'
})

gtb.customer_info({
  :customer_id => '25600',          # REQUIRED: A unique Customer Identification specified by you
  :first_name  => 'Frank',            # CONDITIONAL: Either the First and Last name or Company name must be specified
  :last_name   => 'DeFazio',           # CONDITIONAL: Either the First and Last name or Company name must be specified
  :company     => 'Guardian Storage Solutions',     # CONDITIONAL: Either the First and Last name or Company name must be specified
  :address     => '5879 Centre Avenue',     # OPTIONAL
  :city        => 'Pittsburgh',        # OPTIONAL
  :state       => 'PA',               # OPTIONAL
  :zip         => '15206',            # OPTIONAL
  :country     => 'US',               # OPTIONAL
  :phone       => '412-661-7368',     # OPTIONAL
  :email       => 'fd@guardianstorage.com'  # OPTIONAL
})

gtb.transaction_info({
  :transaction_type  => 'ES',                   # REQUIRED: For CC: AS, DS, ES, CR, VO   For ACH: DH, DC   Other: RM
  :invoice_id        => '123456',               # REQUIRED: A unique ID field specified by you
  :amount            => '545.00',                # REQUIRED
  :process_date      => '20110501',             # OPTIONAL: Pass a date in YYYYMMDD format
  :memo              => 'This might be a memo', # OPTIONAL
  :notes             => 'This might be a note', # OPTIONAL
  :occurrence_type   => 'month'                # OPTIONAL: week, biweek, month, bimonth, semiannual, annual
})

gtb.card_info({
  :cc_number => '376740363891042', # REQUIRED for CC Transactions
  :cc_exp    => '0714',             # REQUIRED for CC Transactions
  :cc_name   => 'Frank DeFazio',     # OPTIONAL
  :cc_type   => 'AX',               # OPTIONAL: VS, MC, AX, DC
  :cc_cvv    => '9153'               # OPTIONAL
})

# Retrieve the information being sent to the server.
puts gtb.url_data

# Process our data
gtb.process

# Get our response and status
puts gtb.response_info.inspect