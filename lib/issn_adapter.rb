class IssnAdapter
  require "uri"
  require "net/https"
  require 'cobravsmongoose'

  def self.find_facilities
    @@query += "&sPostalCode=85021&sCity=&sState=&sStreetAddress=&sMilesDistance=25&sSizeCodes=&sFacilityFeatureCodes=&sSizeTypeFeatureCodes=&sOrderBy="
    response = call_issn 'ISSN_findFacilities'
    get_data_from_soap_response(response, :FindFacility)
  end

  def self.call_issn(method)
    uri = URI.parse(@@host + @@url)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    http.start { |h| h.get(uri.path + '/' + method + @@query) }
  end

  # parse the complex soap schema into a simple ruby hash
  def self.get_data_from_soap_response(response, key)
    data = get_soap_data(response.body)[key.to_sym]
    data.is_a?(Array) ? get_data_from_soap_array(data) : get_data_from_soap_hash(data)
  end

  def self.get_soap_data(response_body)
    CobraVsMongoose.xml_to_hash(response_body).deep_symbolize_keys[:DataSet][:"diffgr:diffgram"][:NewDataSet]
  end

  def self.get_data_from_soap_array(data)
    parsed = []
    data.each do |hash|
      parsed << get_data_from_soap_hash(hash.deep_symbolize_keys) rescue nil
    end
    parsed
  end

  def self.get_data_from_soap_hash(data)
    parsed = {}
    data.each { |k, v| parsed.store k, v[:"$"] }
    parsed
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