include Nestful

facility_ids = %w(
  a2c018ba-54ca-44eb-9972-090252ef00c5
)

method = 'ISSN_'+ ARGV[0]
username = 'USSL_TEST'
password = 'U$$L722'
query = "?sUserLogin=#{username}&sUserPassword=#{password}"


case method
when 'ISSN_findFacilities'
  query += "&sPostalCode=85021&sCity=&sState=&sStreetAddress=&sMilesDistance=5&sSizeCodes=&sFacilityFeatureCodes=&sSizeTypeFeatureCodes=&sOrderBy="
when 'ISSN_getFacilityInfo'
  fac_id = facility_ids[ARGV[1] || 0]
  query += "&sFacilityId=#{CGI.escape(fac_id)}&sIssnId="
end

host = "http://issn.opentechalliance.com"
url = "/issn_ws1/issn_ws1.asmx/#{method}#{query}"

puts "GET #{url}"
puts "Host: #{host}"
=begin
uri = URI.parse "#{host}#{url}"
request = Net::HTTP::Get.new uri.request_uri
request.initialize_http_header({"User-Agent" => "Firefox/3.6.8"})
response = Net::HTTP.new(uri.host, uri.port).request(request)

puts response.code
puts response
=end

raise Nestful.pretty_inspect