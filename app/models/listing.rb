class Listing < ActiveRecord::Base
  
  belongs_to :client, :foreign_key => 'user_id'
  
  has_one  :map
  acts_as_mappable :through => :map
  accepts_nested_attributes_for :map
  
  has_many :specials
  has_many :pictures
  has_many :sizes
  
  validates_presence_of :title, :message => 'Facility Name can\'t be blank'
  
  access_shared_methods
  acts_as_taggable_on :tags
  
  # Instance Methods
  
  def display_special
    self.special && self.special.content ? self.special.content : 'No Specials'
  end
  
  def special
    self.specials.first
  end
  
  def get_partial_link(name)
    "/ajax/get_partial?model=Listing&id=#{id}&partial=views/partials/greyresults/#{name.to_s}"
  end
  
  def city_and_state
    self.map.nil? ? [] : [self.map.city, self.map.state]
  end
  
  def address() self.map.address end
  def city()    self.map.city end
  def state()   self.map.state end
  def zip()     self.map.zip end
    
  def lat() self.map.lat end
  def lng() self.map.lng end
  

  @@facility_ids = %w(
    a2c018ba-54ca-44eb-9972-090252ef00c5
    42e2550d-e233-dd11-a002-0015c5f270db
  )

  @@username = 'USSL'+ (RAILS_ENV == 'development' ? '_TEST' : '')
  @@password = 'U$$L722'
  @@host = "http://issn.opentechalliance.com"
  @@url = '/issn_ws1/issn_ws1.asmx/'
  @@query = "?sUserLogin=#{@@username}&sUserPassword=#{@@password}"

  include HTTParty
  require 'cobravsmongoose'
  
  def self.findFacilities
    @@query += "&sPostalCode=85021&sCity=&sState=&sStreetAddress=&sMilesDistance=25&sSizeCodes=&sFacilityFeatureCodes=&sSizeTypeFeatureCodes=&sOrderBy="
    
    query = @@host + @@url + 'ISSN_findFacilities' + @@query
    response = self.get query, :format => :xml
    data = CobraVsMongoose.xml_to_hash(response.body)['DataSet'].deep_symbolize_keys[:"diffgr:diffgram"][:NewDataSet][:FindFacility]
    els = []

    data.each do |d|
      els << d["sFacilityID"]["$"]
    end
    
    raise els.pretty_inspect
  end
  
  def self.getFacilityInfo(which = 0)
    @@query += "&sFacilityId=#{@@facility_ids[which]}&sIssnId="

    query = @@host + @@url + 'ISSN_getFacilityInfo' + @@query
    response = self.get query, :format => :xml
    data = CobraVsMongoose.xml_to_hash(response.body).deep_symbolize_keys
    raise data.pretty_inspect
  end

end
