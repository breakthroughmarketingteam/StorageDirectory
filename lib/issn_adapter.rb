class IssnAdapter
  require "uri"
  require "net/https"
  require 'cobravsmongoose'

  def self.find_facilities
    @@query += "&sPostalCode=85021&sCity=&sState=&sStreetAddress=&sMilesDistance=25&sSizeCodes=&sFacilityFeatureCodes=&sSizeTypeFeatureCodes=&sOrderBy="
    response = call_issn 'findFacilities'
    parse_response(response, :FindFacility)
  end

  def self.call_issn(method)
    uri = URI.parse(@@host + @@url)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    
    full_url = uri.path + '/ISSN_' + method + @@query
    puts '*******************************************'
    puts " SENDING ISSN REQUEST: #{full_url}"
    puts '*******************************************'
    res = http.start { |h| h.get(full_url) }
    puts res.body
    
    res
  end

  # parse the complex soap schema into a simple ruby hash
  def self.parse_response(response, method)
    data = soap_data_set(response.body, method)
    data.is_a?(Array) ? parse_soap_array(data) : parse_soap_hash(data)
  end

  def self.soap_data_set(body, method)
    CobraVsMongoose.xml_to_hash(body).deep_symbolize_keys[:DataSet][:"diffgr:diffgram"][:NewDataSet][data_key_for(method)]
  end

  def self.parse_soap_array(data)
    parsed = []
    data.each do |hash|
      parsed << parse_soap_hash(hash.deep_symbolize_keys) rescue nil
    end
    parsed
  end

  def self.parse_soap_hash(data)
    parsed = {}
    data.each { |k, v| parsed.store(k, v[:"$"]) unless useless_keys.include? k }
    parsed
  end
  
  def self.data_key_for(method)
  # get_facility_info
    case method when 'getFacilityInfo', 'getFacilityFeatures'
        :FacilityFeatures
      when 'getFacilityDataGroup'
        :FacilityDG
      when 'getFacilityInsurance'
        :Facility_Insurance
      when 'getFacilityPromos'
        :Facility_Promos
      when 'getFacilityUnitTypes'
        :Facility_UnitTypes
      when 'getFacilityUnits'
        :FacilityUnits
    # END get_facility_info
    
    # get_standard_info
      when 'getStdFacilityFeatures'
        :StdFacilityFeatures
      when 'getStdUnitTypeFeatures'
        :StdUnitTypeFeatures
      when 'getStdUnitTypeSizes'
        :StdUnitTypeSizes
    # END get_standard_info
    
    # get_features, in sizes model
      when 'getFacilityUnitTypesFeatures'
        :Facility_UT_Features
    # END get_Features
    
    # get_unit_info
      when 'getFacilityUnits'
        :FacilityUnits
      
    else # already is a key
      method
    end
  end
  
  def self.useless_keys
    [:"@diffgr:id", :@xmlns, :"@msdata:rowOrder", :sReplyCode]
  end

  cattr_accessor :query, :facility_ids, :facility_unit_types_ids

  @@facility_ids = %w(
    a2c018ba-54ca-44eb-9972-090252ef00c5
    42e2550d-e233-dd11-a002-0015c5f270db
    95D25467-04A2-DD11-A709-0015C5F270DB
  )

  # for unit with id = 42e2550d-e233-dd11-a002-0015c5f270db
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
  @@query = "?sUserLogin=#{@@username}&sUserPassword=#{@@password}"
end