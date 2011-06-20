class IssnAdapter
  %w(uri net/https cobravsmongoose cgi).map { |lib| require lib }
  
  # test data
  @@facility_ids = %w(
    a2c018ba-54ca-44eb-9972-090252ef00c5
    42e2550d-e233-dd11-a002-0015c5f270db
    95D25467-04A2-DD11-A709-0015C5F270DB
  )

  @@username = 'USSL'
  @@password = 'U$$L722'
  @@host = 'https://issn.opentechalliance.com'
  @@url = '/issn_ws1/issn_ws1.asmx'
  @@auth = "?sUserLogin=#{@@username}&sUserPassword=#{@@password}"
  
  cattr_accessor :query, :facility_ids, :facility_unit_types_ids
  
  #
  # Data Retrieval
  #
  
  def self.find_facilities(args = {})
    query = "&sPostalCode=#{escape_query args[:zip] || '85021'}&sCity=#{escape_query args[:city]}&sState=#{escape_query args[:state]}&sStreetAddress=#{escape_query args[:address]}&sMilesDistance=#{escape_query args[:within] || '15'}&sSizeCodes=#{escape_query args[:size_code]}&sFacilityFeatureCodes=#{escape_query args[:facility_feature_code]}&sSizeTypeFeatureCodes=#{escape_query args[:size_type_feature_code]}&sOrderBy=#{escape_query args[:order]}"
    call_and_parse 'findFacilities', query
  end
  
  def self.get_authorized_facilities(args = {})
    call_and_parse 'admin_getUsersFacilities', "&sForUser=#{escape_query args[:user] || @@username}"
  end
  
  # ISSN methods that only require a facility id
  def self.get_facility_info(method = 'getFacilityInfo', facility_id = nil)
    query = "&sFacilityId=#{facility_id}&sIssnId="
    call_and_parse method, query
  end
  
  # ISSN methods that have std in the name, they dont require further parameters
  def self.get_standard_info(method = 'getStdFacilityFeatures')
    call_and_parse method
  end
  
  # Abstraction
  def self.get_unit_info(facility_id = nil, type_id = nil)
    query = "&sFacilityId=#{facility_id}&sFacilityUnitTypeId=#{type_id}"
    call_and_parse 'getFacilityUnits', query
  end
  
  def self.get_unit_features(facility_id, type_id = nil)
    query = "&sFacilityId=#{facility_id}&sFacilityUnitTypesId=#{type_id}"
    call_and_parse 'getFacilityUnitTypesFeatures', query
  end
  
  def self.get_facility_promos(facility_id)
    get_facility_info 'getFacilityPromos', facility_id
  end
  
  def self.get_facility_insurance(facility_id)
    get_facility_info 'getFacilityInsurance', facility_id
  end
  
  def self.get_move_in_cost(facility_id, args = {})
    query = "&sFacilityId=#{facility_id}&sFacilityUnitTypesId=#{escape_query args[:type_id]}&sFacilityUnitId=#{escape_query args[:unit_id]}&sPromoCode=#{escape_query args[:promo_code]}&sInsuranceId=#{escape_query args[:insurance_id]}"
    call_and_parse 'getMoveinCost', query
  end
  
  def self.get_reserve_cost(facility_id, args = {})
    query = "&sFacilityId=#{facility_id}&sFacilityUnitTypesId=#{escape_query args[:type_id]}&sUnitId=#{escape_query args[:unit_id]}&sForDateYMD=#{escape_query args[:date]}"
    call_and_parse 'getReserveCost', query
  end
  
  def self.build_issn_tenant_args(tenant, billing_info, rental)
    usa = 'United States of America'
    args = {
      :type_id            => rental.size.unit_type.try(:sID),
      :reserve_until_date => parse_date_to_YMD(rental.move_in_date),
      :pay_months         => 0,
      :tenant => {
        :first_name => tenant.first_name,
        :last_name  => tenant.last_name,
        :address    => billing_info.address,
        :address2   => '',
        :city       => billing_info.city,
        :state      => billing_info.state,
        :zip        => billing_info.zip.to_s,
        :country    => usa,
        :home_phone => '',
        :email      => tenant.email,
        :billing => {
          :address  => billing_info.address,
          :address2 => '',
          :city     => billing_info.city,
          :state    => billing_info.state,
          :zip      => billing_info.zip.to_s,
          :country  => usa
        },
        :alt => {},
        :military => {},
      },
      :pay_type => 'CC',
      :credit_card => {
        :type         => billing_info.card_type,
        :name_on_card => billing_info.name,
        :number       => billing_info.card_number,
        :zip          => billing_info.zip.to_s,
        :cvv          => billing_info.cvv.to_s,
        :expires => {
          :month => billing_info.expires_month,
          :year  => "20#{billing_info.expires_year}"
        }
      },
      :bank => {},
      :check_number => '',
      :amount_to_apply => rental.total.to_s
    }
  end
  
  def self.process_new_tenant(facility_id, args = {})
    query = "&sFacilityId=#{facility_id}"+
            "&sFacilityUnitTypesId=#{escape_query args[:type_id]}"+
            "&sFacilityUnitId=#{escape_query args[:unit_id]}"+
            "&sPromoId=#{escape_query args[:promo_id]}"+
            "&sInsuranceId=#{escape_query args[:insurance_id]}"+
            "&sReserveUntilDateYMD=#{escape_query args[:reserve_until_date]}"+
            "&sPayMonths=#{escape_query args[:pay_months]}"+
            "&sTenantCompanyName=#{escape_query args[:tenant][:company_name]}"+
            "&sTenantFirstName=#{escape_query args[:tenant][:first_name]}"+
            "&sTenantLastName=#{escape_query args[:tenant][:last_name]}"+
            "&sTenantAddress1=#{escape_query args[:tenant][:address]}"+
            "&sTenantAddress2=#{escape_query args[:tenant][:address2]}"+
            "&sTenantCity=#{escape_query args[:tenant][:city]}"+
            "&sTenantState=#{escape_query args[:tenant][:state]}"+
            "&sTenantPostalCode=#{escape_query args[:tenant][:zip]}"+
            "&sTenantCountry=#{escape_query args[:tenant][:country]}"+
            "&sTenantHomePhone=#{escape_query args[:tenant][:home_phone]}"+
            "&sTenantWorkPhone=#{escape_query args[:tenant][:work_phone]}"+
            "&sTenantMobilePhone=#{escape_query args[:tenant][:mobile_phone]}"+
            "&sTenantEmail=#{escape_query args[:tenant][:email]}"+
            "&sTenantEmployer=#{escape_query args[:tenant][:employer]}"+
            "&sTenantDriverLicense=#{escape_query args[:tenant][:driver_license]}"+
            "&sTenantDriverLicenseState=#{escape_query args[:tenant][:driver_license_state]}"+
            "&sTenantVehicleType=#{escape_query args[:tenant][:vehicle_type]}"+
            "&sTenantVehiclePlate=#{escape_query args[:tenant][:vehicle_plate]}"+
            "&sTenantBillingAddress1=#{escape_query args[:tenant][:billing][:address]}"+
            "&sTenantBillingAddress2=#{escape_query args[:tenant][:billing][:address2]}"+
            "&sTenantBillingCity=#{escape_query args[:tenant][:billing][:city]}"+
            "&sTenantBillingState=#{escape_query args[:tenant][:billing][:state]}"+
            "&sTenantBillingPostalCode=#{escape_query args[:tenant][:billing][:zip]}"+
            "&sTenantBillingCountry=#{escape_query args[:tenant][:billing][:country]}"+
            "&sTenantAltFirstName=#{escape_query args[:tenant][:alt][:first_name]}"+
            "&sTenantAltLastName=#{escape_query args[:tenant][:alt][:last_name]}"+
            "&sTenantAltPhone=#{escape_query args[:tenant][:alt][:phone]}"+
            "&sTenantMilitaryFlag=#{escape_query args[:tenant][:military][:flag]}"+
            "&sTenantMilitaryBase=#{escape_query args[:tenant][:military][:base]}"+
            "&sTenantMilitaryContact=#{escape_query args[:tenant][:military][:contact]}"+
            "&sTenantMilitaryPhone=#{escape_query args[:tenant][:military][:phone]}"+
            "&sTenantSocialSecurityNumber=#{escape_query args[:tenant][:social_security_number]}"+
            "&sPayType=#{escape_query args[:pay_type]}"+
            "&sCreditCardType=#{escape_query args[:credit_card][:type]}"+
            "&sCreditCardNameOnCard=#{escape_query args[:credit_card][:name_on_card]}"+
            "&sCreditCardNumber=#{escape_query args[:credit_card][:number]}"+
            "&sCreditCardExpMonth=#{escape_query pad_int_str(args[:credit_card][:expires][:month])}"+
            "&sCreditCardExpYear=#{escape_query pad_int_str(args[:credit_card][:expires][:year])}"+
            "&sCreditCardPostalCode=#{escape_query args[:credit_card][:zip]}"+
            "&sCreditCardCCV=#{escape_query args[:credit_card][:cvv]}"+
            "&sSaveCreditCardInfo=#{escape_query args[:save_credit_card_info]}"+
            "&sBankRoutingNumber=#{escape_query args[:bank][:routing_number]}"+
            "&sBankAccountNumber=#{escape_query args[:bank][:account_number]}"+
            "&sBankName=#{escape_query args[:bank][:name]}"+
            "&sBankAccountName=#{escape_query args[:bank][:account_name]}"+
            "&sCheckNumber=#{escape_query args[:check_number]}"+
            "&sAmountToApply=#{escape_query args[:amount_to_apply]}"
    call_and_parse 'processNewTenant', query
  end
  
  def process_tenant_payment(facility_id, args = {})
    query = "&sFacilityId=#{facility_id}
             &sUnitName=#{escape_query args[:unit_name]}
             &sTenantId=#{escape_query args[:tenant_id]}
             &sTenantPIN=#{escape_query args[:tenant_pin]}
             &sPayType=#{escape_query args[:pay_type]}
             &sCreditCardType=#{escape_query args[:credit_card][:type]}
             &sCreditCardNameOnCard=#{escape_query args[:credit_card][:name_on_card]}
             &sCreditCardNumber=#{escape_query args[:credit_card][:number]}
             &sCreditCardExpMonth=#{escape_query args[:credit_card][:expires][:month]}
             &sCreditCardExpYear=#{escape_query args[:credit_card][:expires][:year]}
             &sCreditCardPostalCode=#{escape_query args[:credit_card][:zip]}
             &sCreditCardCCV=#{escape_query args[:credit_card][:cvv]}
             &sBankRoutingNumber=#{escape_query args[:bank][:routing_number]}
             &sBankAccountNumber=#{escape_query args[:bank][:account_number]}
             &sBankName=#{escape_query args[:bank][:name]}
             &sBankAccountName=#{escape_query args[:bank][:account_name]}
             &sCheckNumber=#{escape_query args[:check_number]}
             &sAmountToApply=#{escape_query args[:amount_to_apply]}
             &sMonthsToPay=#{escape_query args[:months_to_pay]}"
    call_and_parse 'processTenantPayment'
  end
  
  # other methods
  def self.my_ip
    call_and_parse_simple 'MyIPaddress'
  end
  
  # Database updater
  # :data => issn data, :assoc => model to create or update, :find_method => to update an existing assoc model, :find_attr => the atr to find by
  def self.update_models_from_issn(args)
    (args[:class] || args[:model]).transaction(:requires_new => true) do
      args[:data].each do |m|
        # assoc is the authoritative assoc model in the rails app that will be synced with the similar issn model
        # e.g: Specials to FacilityPromos, Sizes to Unit Types... Note: these are assoc to Listing (the issn enabled model)
        
        model = args[:model].send(args[:find_method], m[args[:find_attr]]) || args[:model].create
        m.each do |name, value|
          name = name.sub /^s/, '' unless name == 'sID'
          model.update_attribute name, value if model.respond_to? name
        end
      end
    end
    
    true
  rescue => e
    puts e.message
    false
  end
  
  #
  # Connector and Parsers
  #
  def self.call_and_parse(method, query = '')
    response = call_issn method, query
    parse_response response, method
  end
  
  def self.call_and_parse_simple(method)
    response = call_issn method
    parse_simple response, method
  end
  
  def self.call_issn(method, query = '')
    uri = URI.parse(@@host + @@url)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    
    full_url = @@host + uri.path + path_str(method, query)
    puts '*******************************************'
    puts "SENDING ISSN REQUEST: #{full_url}"
    puts '*******************************************'
    response = http.start { |h| h.get full_url }
    puts response.body
    
    return response
  end
  
  def self.path_str(method, query)
    return "/_#{method}" if method =~ /(MyIPaddress)/i
    '/ISSN' + (/^(admin)/.match(method) ? method : "_#{method}") + @@auth + query
  end

  # parse the complex soap schema into a simple ruby hash
  def self.parse_response(response, method)
    parse_hash_or_array soap_data_set(response.body, method)
  end
  
  def self.parse_simple(response, method)
    simple_soap_data_set(response.body, method)
  end

  def self.soap_data_set(body, method)
    CobraVsMongoose.xml_to_hash(body)['DataSet']['diffgr:diffgram']['NewDataSet'][data_key_for(method)]
  end
  
  def self.simple_soap_data_set(body, method)
    case method when 'MyIPaddress'
      CobraVsMongoose.xml_to_hash(body)['string']['$'].reject { |key| useless_keys.include? key }.first
    else
      CobraVsMongoose.xml_to_hash(body).reject { |k| useless_keys.include? k }
    end
  end

  def self.parse_soap_array(data)
    parsed = []
    data.each do |hash|
      parsed << parse_soap_hash(hash) rescue nil
    end
    parsed
  end

  def self.parse_soap_hash(data)
    parsed = {}
    data.each do |name, value|
      next if useless_keys.include? name
      # account for multidimensional hashes
      value = value['diffgr:diffgram'].blank? ? value['$'] : parse_hash_or_array(value['diffgr:diffgram']['NewDataSet'].values.first)
      parsed.store(name, value)
    end
    parsed
  end
  
  def self.parse_hash_or_array(value)
    value.is_a?(Array) ? parse_soap_array(value) : parse_soap_hash(value)
  end
  
  def self.parse_date_to_YMD(date)
    "#{date.year}#{pad_int_str(date.month)}#{pad_int_str(date.day)}"
  end
  
  # add a 0 to an integer < 10
  def self.pad_int_str(int)
    int.to_s.size == 1 ? '0'+ int.to_s : int.to_s
  end
  
  def self.escape_query(q)
    CGI.escape q if q.is_a?(String)
  end
  
  # DataSet key mappings
  def self.data_key_for(method)
    case method when 'findFacilities'
        'FindFacility'
    # get_facility_info
      when 'getFacilityInfo', 'getFacilityFeatures'
        'FacilityFeatures'
      when 'getFacilityDataGroup'
        'FacilityDG'
      when 'getFacilityInsurance'
        'Facility_Insurance'
      when 'getFacilityPromos'
        'Facility_Promos'
      when 'getFacilityUnitTypes'
        'Facility_UnitTypes'
      when 'getFacilityUnits'
        'FacilityUnits'
    
    # get_standard_info
      when 'getStdFacilityFeatures'
        'StdFacilityFeatures'
      when 'getStdUnitTypeFeatures'
        'StdUnitTypeFeatures'
      when 'getStdUnitTypeSizes'
        'StdUnitTypeSizes'
    
    # get_features, in sizes model
      when 'getFacilityUnitTypesFeatures'
        'Facility_UT_Features'
      
      when 'getMoveinCost'
        'MoveInCost'
      when 'getReserveCost'
        'ReserveCost'
    
      when 'processNewTenant'
        'processNewTenant'
      when 'processTenantPayment'
        'processTenantPayment'
        
    # admin methods
      when 'admin_getUsersFacilities'
        'UsersFacilities'
    else # already is a key
      method
    end
  end
  
  def self.no_fatal_error?(error_message)
    return true if error_message.blank?
    error_message.match /(Account Created)/i
  end
  
  def self.useless_keys
    ['@diffgr:id', '@xmlns', '@msdata:rowOrder', 'sReplyCode']
  end
  
  def self.rand_facility_id
    @@facility_ids[rand(@@facility_ids.size-1)]
  end
  
end