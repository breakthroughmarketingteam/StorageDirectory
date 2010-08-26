class Size < ActiveRecord::Base
  
  belongs_to :listing
  
  attr_accessor :special
  
  def display_dimensions
    "#{x} x #{y}"
  end
  
  #
  # ISSN wrapper code
  #
  require 'issn_adapter'
  
  def get_features(method = 'getFacilityUnitTypesFeatures')
    IssnAdapter.query += "&sFacilityId=#{IssnAdapter.facility_ids[1]}&sFacilityUnitTypesId=#{IssnAdapter.facility_unit_types_ids[0]}"
    response = IssnAdapter.call_issn method
    
    data = IssnAdapter.parse_response(response, method)
    raise data.pretty_inspect
  end
  
end
