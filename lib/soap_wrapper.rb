require 'digest/sha1'
require 'soap/wsdlDriver'

module WebServices
  class SOAPInterface
    attr_accessor :endpoint, :service

    def initialize(endpoint)
      @endpoint = endpoint
    end

    # --
    # your methods go here
    # -- 
    def getFacilityInfo(params)
      soap = wsdl.create_rpc_driver
      raise soap.pretty_inspect
      response = soap.ISSN_getFacilityInfo(params)
      raise response.pretty_inspect
      result = response.ISSNgetFacilityInfo
      soap.reset_stream
      result
      #DataSetParser.new(result, 'user').user
    end

    private
      def wsdl
        SOAP::WSDLDriverFactory.new("http://#{@endpoint}")    
      end    
  end

  # pulls out the diffgram of SOAP::Mapping::Object's into an array
  class DataSetParser
    def initialize(soap_response, data_set)
      @response = soap_response
      @data_set = data_set
    end

    # allows for @obj['CourseListing'] to be @obj.course_listing
    def method_missing(name, *args)
      @response.send(:diffgram).send(@data_set.to_sym).send(:[], name.to_s.camelize)
    end
  end
end
