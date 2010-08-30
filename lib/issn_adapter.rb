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
  def self.find_facilities(query = {})
    response = call_issn 'findFacilities', "&sPostalCode=#{query[:zip] || '85021'}&sCity=#{query[:city]}&sState=#{query[:state]}&sStreetAddress=#{query[:address]}&sMilesDistance=#{query[:within] || '15'}&sSizeCodes=#{query[:size_code]}&sFacilityFeatureCodes=#{query[:facility_feature_code]}&sSizeTypeFeatureCodes=#{query[:size_type_feature_code]}&sOrderBy=#{query[:order]}"
    parse_response response, 'FindFacility'
  end
  
  # ISSN methods that only require a facility id
  def self.get_facility_info(method = 'getFacilityInfo', facility_id = nil)
    response = IssnAdapter.call_issn method, "&sFacilityId=#{facility_id || IssnAdapter.facility_ids[1]}&sIssnId="
    data = IssnAdapter.parse_response response, method
  end
  
  def self.get_unit_info(facility_id = nil, type_id = nil)
    method = 'getFacilityUnits'
    response = IssnAdapter.call_issn method, "&sFacilityId=#{facility_id || IssnAdapter.facility_ids[1]}&sFacilityUnitTypeId=#{type_id || IssnAdapter.facility_unit_types_ids[0]}"
    data = IssnAdapter.parse_response(response, method)
  end
  
  # ISSN methods that have std in the name, they dont required further parameters
  def self.get_standard_info(method = 'getStdFacilityFeatures')
    response = IssnAdapter.call_issn method
    data = IssnAdapter.parse_response response, method
  end
  
  #
  # Connector and Parsers
  #
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
      
    else # already is a key
      method
    end
  end
  
  def self.useless_keys
    ["@diffgr:id", '@xmlns', "@msdata:rowOrder", 'sReplyCode']
  end
  
end