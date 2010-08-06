require 'PP'
require "net/https"
require "uri"

raise ARGV.pretty_inspect
# Example Facility ID: a2c018ba-54ca-44eb-9972-090252ef00c5

method = 'ISSN_'+ ARGV[0]
username = 'USSL_TEST'
password = 'U$$L722'
query = "?sUserLogin=#{username}&sUserPassword=#{password}&sPostalCode=85021&sCity=&sState=&sStreetAddress=&sMilesDistance=5&sSizeCodes=&sFacilityFeatureCodes=&sSizeTypeFeatureCodes=&sOrderBy="
url = "http://issn.opentechalliance.com/issn_ws1/issn_ws1.asmx/#{method}#{query}"
puts "send request to #{url}"


uri = URI.parse(url)
  puts uri.inspect

http = Net::HTTP.new(uri.host, uri.port)
  puts http.inspect

request = Net::HTTP::Get.new(uri.request_uri)
request.initialize_http_header({"User-Agent" => "Firefox/3.6.8"})
  puts request.inspect

response = http.request(request)

puts response.inspect
puts response.code
puts response["location"] # All headers are lowercase
puts response