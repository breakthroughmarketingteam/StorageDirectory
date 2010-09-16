class IssnAdapter
  require "uri"
  require "net/https"
  require 'cobravsmongoose'
  
  # test data
  @@facility_ids = %w(
    a2c018ba-54ca-44eb-9972-090252ef00c5
    42e2550d-e233-dd11-a002-0015c5f270db
    95D25467-04A2-DD11-A709-0015C5F270DB
  )

  @@username = 'USSL'
  @@password = 'U$$L722'
  @@host = "https://issn.opentechalliance.com"
  @@url = '/issn_ws1/issn_ws1.asmx'
  @@auth = "?sUserLogin=#{@@username}&sUserPassword=#{@@password}"
  
  cattr_accessor :query, :facility_ids, :facility_unit_types_ids
  
  #
  # Data Retrieval
  #
  def self.find_facilities(args = {})
    query = "&sPostalCode=#{args[:zip] || '85021'}&sCity=#{args[:city]}&sState=#{args[:state]}&sStreetAddress=#{args[:address]}&sMilesDistance=#{args[:within] || '15'}&sSizeCodes=#{args[:size_code]}&sFacilityFeatureCodes=#{args[:facility_feature_code]}&sSizeTypeFeatureCodes=#{args[:size_type_feature_code]}&sOrderBy=#{args[:order]}"
    call_and_parse 'findFacilities', query
  end
  
  def self.get_authorized_facilities(args = {})
    call_and_parse 'admin_getUsersFacilities', "&sForUser=#{args[:user] || @@username}"
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
  
  def self.get_move_in_cost(facility_id, args = {})
    query = "&sFacilityId=#{facility_id}&sFacilityUnitTypesId=#{args[:type_id]}&sFacilityUnitId=#{args[:unit_id]}&sPromoCode=#{args[:promo_code]}&sInsuranceId=#{args[:insurance_id]}"
    call_and_parse 'getMoveinCost', query
  end
  
  def self.get_reserve_cost(facility_id, args = {})
    query = "&sFacilityId=#{facility_id}&sFacilityUnitTypesId=#{args[:type_id]}&sUnitId=#{args[:unit_id]}&sForDateYMD=#{args[:date]}"
    call_and_parse 'getReserveCost', query
  end
  
  def self.process_new_tenant(facility_id, args = {})
    query = "&sFacilityId=#{facility_id}
             &sFacilityUnitTypesId=#{args[:type_id]}
             &sFacilityUnitId=#{args[:unit_id]}
             &sPromoId=#{args[:promo_id]}
             &sInsuranceId=#{args[:insurance_id]}
             &sReserveUntilDateYMD=#{args[:reserve_until_date]}
             &sPayMonths=#{args[:pay_months]}
             &sTenantCompanyName=#{args[:tenant][:company_name]}
             &sTenantFirstName=#{args[:tenant][:first_name]}
             &sTenantLastName=#{args[:tenant][:last_name]}
             &sTenantAddress1=#{args[:tenant][:address]}
             &sTenantAddress2=#{args[:tenant][:address2]}
             &sTenantCity=#{args[:tenant][:city]}
             &sTenantState=#{args[:tenant][:state]}
             &sTenantPostalCode=#{args[:tenant][:zip]}
             &sTenantCountry=#{args[:tenant][:country]}
             &sTenantHomePhone=#{args[:tenant][:home_phone]}
             &sTenantWorkPhone=#{args[:tenant][:work_phone]}
             &sTenantMobilePhone=#{args[:tenant][:mobile_phone]}
             &sTenantEmail=#{args[:tenant][:email]}
             &sTenantEmployer=#{args[:tenant][:employer]}
             &sTenantDriverLicense=#{args[:tenant][:driver_license]}
             &sTenantDriverLicenseState=#{args[:tenant][:driver_license_state]}
             &sTenantVehicleType=#{args[:tenant][:vehicle_type]}
             &sTenantVehiclePlate=#{args[:tenant][:vehicle_plate]}
             &sTenantBillingAddress1=#{args[:tenant][:billing][:address]}
             &sTenantBillingAddress2=#{args[:tenant][:billing][:address2]}
             &sTenantBillingCity=#{args[:tenant][:billing][:city]}
             &sTenantBillingState=#{args[:tenant][:billing][:state]}
             &sTenantBillingPostalCode=#{args[:tenant][:billing][:zip]}
             &sTenantBillingCountry=#{args[:tenant][:billing][:country]}
             &sTenantAltFirstName=#{args[:tenant][:alt][:first_name]}
             &sTenantAltLastName=#{args[:tenant][:alt][:last_name]}
             &sTenantAltPhone=#{args[:tenant][:alt][:phone]}
             &sTenantMilitaryFlag=#{args[:tenant][:military][:flag]}
             &sTenantMilitaryBase=#{args[:tenant][:military][:base]}
             &sTenantMilitaryContact=#{args[:tenant][:military][:contact]}
             &sTenantMilitaryPhone=#{args[:tenant][:military][:phone]}
             &sTenantSocialSecurityNumber=#{args[:tenant][:social_security_number]}
             &sPayType=#{args[:pay_type]}
             &sCreditCardType=#{args[:credit_card][:type]}
             &sCreditCardNameOnCard=#{args[:credit_card][:name_on_card]}
             &sCreditCardNumber=#{args[:credit_card][:number]}
             &sCreditCardExpMonth=#{args[:credit_card][:expires][:month]}
             &sCreditCardExpYear=#{args[:credit_card][:expires][:year]}
             &sCreditCardPostalCode=#{args[:credit_card][:zip]}
             &sCreditCardCCV=#{args[:credit_card][:ccv]}
             &sSaveCreditCardInfo=#{args[:save_credit_card_info]}
             &sBankRoutingNumber=#{args[:bank][:routing_number]}
             &sBankAccountNumber=#{args[:bank][:account_number]}
             &sBankName=#{args[:bank][:name]}
             &sBankAccountName=#{args[:bank][:account_name]}
             &sCheckNumber=#{args[:check_number]}
             &sAmountToApply=#{args[:amount_to_apply]}"
    call_and_parse 'processNewTenant', query
  end
  
  def process_tenant_payment(facility_id, args = {})
    query = "&sFacilityId=#{facility_id}
             &sUnitName=#{args[:unit_name]}
             &sTenantId=#{args[:tenant_id]}
             &sTenantPIN=#{args[:tenant_pin]}
             &sPayType=#{args[:pay_type]}
             &sCreditCardType=#{args[:credit_card][:type]}
             &sCreditCardNameOnCard=#{args[:credit_card][:name_on_card]}
             &sCreditCardNumber=#{args[:credit_card][:number]}
             &sCreditCardExpMonth=#{args[:credit_card][:expires][:month]}
             &sCreditCardExpYear=#{args[:credit_card][:expires][:year]}
             &sCreditCardPostalCode=#{args[:credit_card][:zip]}
             &sCreditCardCCV=#{args[:credit_card][:ccv]}
             &sBankRoutingNumber=#{args[:bank][:routing_number]}
             &sBankAccountNumber=#{args[:bank][:account_number]}
             &sBankName=#{args[:bank][:name]}
             &sBankAccountName=#{args[:bank][:account_name]}
             &sCheckNumber=#{args[:check_number]}
             &sAmountToApply=#{args[:amount_to_apply]}
             &sMonthsToPay=#{args[:months_to_pay]}"
    call_and_parse 'processTenantPayment'
  end
  
  # Database updater
  # :data => issn data, :assoc => model to create or update, :find_method => to update an existing assoc model, :find_attr => the atr to find by
  def self.update_models_from_issn(args)
    (args[:class] || args[:model]).transaction(:requires_new => true) do
      args[:data].each do |m|
        next if m.keys.include?('sErrorMessage') && !m['sErrorMessage'].blank?
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
  
  def self.call_issn(method, query = '')
    uri = URI.parse(@@host + @@url)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    
    full_url = uri.path + path_str(method, query)
    puts '*******************************************'
    puts "SENDING ISSN REQUEST: #{full_url}"
    puts '*******************************************'
    response = http.start { |h| h.get full_url }
    puts response.body
    
    return response
  end
  
  def self.path_str(method, query)
    '/ISSN' + (/^(admin)/.match(method) ? method : "_#{method}") + @@auth + query
  end

  # parse the complex soap schema into a simple ruby hash
  def self.parse_response(response, method)
    data = soap_data_set response.body, method
    parse_hash_or_array data
  end

  def self.soap_data_set(body, method)
    CobraVsMongoose.xml_to_hash(body)['DataSet']["diffgr:diffgram"]['NewDataSet'][data_key_for(method)]
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
      # account for multidimensional hashes
      value = value['diffgr:diffgram'].blank? ? value['$'] : parse_hash_or_array(value['diffgr:diffgram']['NewDataSet'].values.first)
      parsed.store(name, value) unless useless_keys.include? name
    end
    parsed
  end
  
  def self.parse_hash_or_array(value)
    value.is_a?(Array) ? parse_soap_array(value) : parse_soap_hash(value)
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
        'NewTenant'
      when 'processTenantPayment'
        'TenantPayment'
        
    # admin methods
      when 'admin_getUsersFacilities'
        'UsersFacilities'
    else # already is a key
      method
    end
  end
  
  def self.useless_keys
    ["@diffgr:id", '@xmlns', "@msdata:rowOrder", 'sReplyCode']
  end
  
  def self.rand_facility_id
    @@facility_ids[rand(@@facility_ids.size-1)]
  end
  
end