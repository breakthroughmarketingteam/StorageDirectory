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

  # for facility with id = 42e2550d-e233-dd11-a002-0015c5f270db
  @@facility_unit_types_ids = %w(
    74e90c41-bf5c-4102-90f2-1cc229f2284d
    ce68c0eb-5c17-4c0a-bfb0-6b7a06b33ed4
    baa1afe5-0d33-4dec-a20b-b765fdd6c260
    23459fec-148d-4d74-97cb-ed3041725d1e
  )

  @@username = 'USSL_TEST'
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
  
  # ISSN methods that only require a facility id
  def self.get_facility_info(method = 'getFacilityInfo', facility_id = nil)
    query = "&sFacilityId=#{facility_id || @@facility_ids[1]}&sIssnId="
    call_and_parse method, query
  end
  
  # ISSN methods that have std in the name, they dont require further parameters
  def self.get_standard_info(method = 'getStdFacilityFeatures')
    call_and_parse method
  end
  
  # Abstraction
  def self.get_unit_info(facility_id = nil, type_id = nil)
    query = "&sFacilityId=#{facility_id || @@facility_ids[1]}&sFacilityUnitTypeId=#{type_id || @@facility_unit_types_ids[0]}"
    call_and_parse 'getFacilityUnits', query
  end
  
  def self.get_unit_features(facility_id, type_id)
    query = "&sFacilityId=#{facility_id || IssnAdapter.facility_ids[1]}&sFacilityUnitTypesId=#{type_id || IssnAdapter.facility_unit_types_ids[0]}"
    call_and_parse 'getFacilityUnitTypesFeatures' ,query
  end
  
  def self.get_facility_promos(facility_id)
    get_facility_info 'getFacilityPromos', facility_id
  end
  
  def self.get_move_in_cost(facility_id, args = {})
    query = "&sFacilityId=#{facility_id || @@facility_ids[1]}&sFacilityUnitTypesId=#{args[:type_id]}&sFacilityUnitId=#{args[:unit_id]}&sPromoCode=#{args[:promo_code]}&sInsuranceId=#{args[:insurance_id]}"
    call_and_parse 'getMoveinCost', query
  end
  
  def self.get_reserve_cost(facility_id, args = {})
    query = "&sFacilityId=#{facility_id || @@facility_ids[1]}&sFacilityUnitTypesId=#{args[:type_id]}&sUnitId=#{args[:unit_id]}&sForDateYMD=#{args[:date]}"
    call_and_parse 'getReserveCost', query
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
    
    full_url = uri.path + '/ISSN_' + method + @@auth + query
    puts '*******************************************'
    puts "SENDING ISSN REQUEST: #{full_url}"
    puts '*******************************************'
    response = http.start { |h| h.get full_url }
    puts response.body
    
    return response
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
    case method when 'getFacilityInfo', 'getFacilityFeatures'
    # get_facility_info
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
    # END get_facility_info
    
    # get_standard_info
      when 'getStdFacilityFeatures'
        'StdFacilityFeatures'
      when 'getStdUnitTypeFeatures'
        'StdUnitTypeFeatures'
      when 'getStdUnitTypeSizes'
        'StdUnitTypeSizes'
    # END get_standard_info
    
    # get_features, in sizes model
      when 'getFacilityUnitTypesFeatures'
        'Facility_UT_Features'
    # END get_Features
      
      when 'getMoveinCost'
        'MoveInCost'
      when 'getReserveCost'
        'ReserveCost'
        
    else # already is a key
      method
    end
  end
  
  def self.useless_keys
    ["@diffgr:id", '@xmlns', "@msdata:rowOrder", 'sReplyCode']
  end
  
end