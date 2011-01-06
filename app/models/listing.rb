class Listing < ActiveRecord::Base
  
  belongs_to :client, :foreign_key => 'user_id', :touch => true
  
  # contact info from the csv file, internal use only
  has_one :contact, :class_name => 'ListingContact'
  accepts_nested_attributes_for :contact
  
  has_one  :map, :dependent => :destroy
  accepts_nested_attributes_for :map
  
  has_many :pictures       , :dependent => :destroy
  has_many :reservations   , :dependent => :destroy
  has_many :rentals        , :dependent => :destroy
  has_many :info_requests  , :dependent => :destroy
  has_many :clicks         , :dependent => :destroy
  has_many :impressions    , :dependent => :destroy
  has_many :reviews        , :class_name => 'Comment', :as => :commentable
  has_many :staff_emails   , :dependent => :destroy
  accepts_nested_attributes_for :staff_emails
  
  has_many :business_hours , :dependent => :destroy
  has_many :access_hours, :class_name => 'BusinessHour', :conditions => "LOWER(hours_type) = 'access'"
  has_many :office_hours, :class_name => 'BusinessHour', :conditions => "LOWER(hours_type) = 'office'"
  
  has_many :sizes, :dependent => :destroy do
    def sorted() all.sort_by &:sqft end
  end
  
  #has_many :searches # user searches are associated to listings to gather search behavior data
  
  # OpentTech ISSN data
  has_one  :facility_info, :dependent => :destroy
  has_many :unit_types, :dependent => :destroy
  has_many :units, :class_name => 'FacilityUnit', :through => :unit_types
  has_many :issn_facility_unit_features, :dependent => :destroy
  has_many :promos, :dependent => :destroy
  has_many :facility_features, :dependent => :destroy
  has_many :facility_insurances, :dependent => :destroy
  
  has_attached_file :logo,
    :storage => :s3, 
    :s3_credentials => "#{RAILS_ROOT}/config/amazon_s3.yml",
    :styles => { :thumb => '164x120>' },
    :url => ":s3_domain_url",
    :path => ":attachment/:id/:style_:basename.:extension"
  
  validates_attachment_content_type :logo, :content_type => ['image/png', 'image/jpg', 'image/jpeg', 'image/gif']
  
  validates_presence_of :title, :message => 'Facility Name can\'t be blank'
  
  access_shared_methods
  acts_as_mappable :through => :map
  ajaxful_rateable
  sitemap :order => 'updated_at DESC'
  
  # the most common unit sizes, to display on a premium listing's result partial
  @@top_types      = %w(upper lower drive_up)
  @@upper_types    = %w(upper)
  @@drive_up_types = ['drive up', 'outside']
  @@lower_types    = %w(interior indoor standard lower)
  @@comparables    = %w(distance 24_hour_access climate_controlled drive_up_access truck_rentals boxes_&_supplies business_center keypad_access online_bill_pay security_cameras se_habla_español facility_special move_in_price)
  @@searchables    = %w(title address city state zip)
  cattr_accessor :top_types, :comparables, :searchables
  
  #
  # Search methods
  #
  def self.find_by_location(search)
    @location = search.location
    
    # build the options for the model find method
    options = {
      :include => [:map, :sizes, :pictures],
      :within  => search.within,
      :origin  => search.lat_lng
    }
    
    base_conditions = 'listings.enabled IS TRUE'
    search_type = search.storage_type.downcase
    
    unless search_type =~ /(self storage)/i
      options[:include] << :facility_features
      base_conditions += " AND LOWER(listings.storage_types) LIKE '%#{search_type}%'"
    end
    
    if !search.is_address_query? && !search.query.blank? # try query by name? 
      conditions = { :conditions => ["listings.title LIKE ? OR listings.title IN (?) AND #{base_conditions}", "%#{search.query}%", search.query.split(/\s|,\s?/)] }
      options.merge! conditions
      
      @location = Geokit::GeoLoc.new Listing.first(conditions)
      options.merge! :origin => @location
    else
      options[:conditions] = base_conditions
    end
    
    @listings = Listing.all options
    
    # prioritize the listings order by putting the most specific ones first (according to the search params, if any)
    unless search.unit_size.blank?
      all_premium = @listings.select(&:premium?)
      
      kinda_specific = all_premium.select { |p| !p.sizes.empty? }.sort_by_distance_from @location
      
      # TODO: match unit features
      very_specific = kinda_specific.select do |p|
        p.sizes.any? { |s| s.dims == search.unit_size }
      end.sort_by_distance_from @location

      remaining_premium = all_premium.reject { |p| kinda_specific.include?(p) || very_specific.include?(p) }.sort_by_distance_from @location
      # ordering the results
      @listings = very_specific | kinda_specific | remaining_premium | @listings.select(&:unverified?).sort_by_distance_from(@location)
    else
      @listings = @listings.sort_by_distance_from @location
    end
    
    @listings = sort_listings(@listings, search) unless search.sorted_by.blank?
    @listings
  end
  
  def self.sort_listings(listings, search)
    case search.sorted_by when 'distance'
      listings = listings.sort_by_distance_from search.location
    when 'name'
      listings = listings.sort_by &:title
    when 'price'
      listings.sort_by { |listing| listing.sizes.empty? ? -1 : listing.sizes.first.price }
    end
    
    listings.reverse! if search.sort_reverse == '+'
    listings
  end
  
  def self.get_featured_listing(listings)
    min = (listings.size/2).ceil
    listings[min..listings.size][rand(min)]
  end
  
  def self.temp_featured_listing(search)
    self.find(:all, :conditions => ['listings.id = ?', 85480], :origin => search.location).sort_by_distance_from(search.location).first
  end
  
  # Instance Methods
  
  def web_special
    self.web_specials.last
  end
  
  def specials
    return [] if self.client.nil?
    self.client.predefined_specials
  end
  
  def special
    self.specials.last
  end
  
  def display_special
    self.client.display_special if self.client
  end
  
  def admin_fee
    val = read_attribute(:admin_fee) || 20
    val /= 100 if val > 100
    val
  end
  
  def admin_fee=(val)
    if val.is_a?(String) && val.match(/\.{1}/)
      write_attribute :admin_fee, (val.to_f * 100)
    else
      super
    end
  end
  
  def tax_rate
    (read_attribute(:tax_rate) || 6) / 100.0
  end
  
  def hours_filled_out?
    !self.business_hours.empty? || self.access_24_hours? || self.office_24_hours?
  end
  
  def siblings
    self.client ? self.client.listings.select { |l| l != self } : []
  end
  
  def storage_type
    self.storage_types.blank? ? 'self storage' : self.storage_types.split(',').first
  end
  
  def update_description(other_listing)
    self.update_attribute :description, other_listing.description
  end
  
  def update_business_hours(other_listing)
    if other_listing.access_24_hours?
      self.update_attribute :access_24_hours, other_listing.access_24_hours
    end
    
    if other_listing.office_24_hours?
      self.update_attribute :office_24_hours, other_listing.office_24_hours
    end
    
    other_listing.business_hours.each do |hour|
      self.business_hours.create hour.attributes
    end
  end
  
  def get_searched_size(search)
    return self.sizes.first if search.nil? || search.unit_size.nil?
    dims = search.unit_size.split('x')
    self.sizes.find :first, :conditions => ['width = ? AND length = ?', dims[0], dims[1]]
  end
  
  def get_partial_link(name)
    "/ajax/get_partial?model=Listing&id=#{id}&partial=views/partials/greyresults/#{name.to_s}&show_size_ops=true"
  end
  
  def city_and_state
    self.map.nil? ? [] : [self.map.city, self.map.state]
  end
  
  def get_closest_unit_size(size)
    @unit_size ||= self.available_sizes.detect { |s| s.dims == size } || self.available_sizes.first
  end
  
  def get_upper_type_size(size)
    @upper_type_size ||= self.sizes.all(:conditions => ['width = ? AND length = ?', size.width, size.length]).detect do |size|
      @@upper_types.any? { |type| size.title =~ /(#{type})/i }
    end
  end
  
  def get_drive_up_type_size(size)
    @drive_up_type_size ||= self.sizes.all(:conditions => ['width = ? AND length = ?', size.width, size.length]).detect do |size|
      @@drive_up_types.any? { |type| size.title =~ /(#{type})/i }
    end
  end
  
  def get_interior_type_size(size)
    @interior_type_size ||= self.sizes.all(:conditions => ['width = ? AND length = ?', size.width, size.length]).detect do |size|
      @@lower_types.any? { |type| size.title =~ /(#{type})/i }
    end
  end
  
  # TODO: figure this shit out
  def address; self.map.address end
  def city; self.map.city end
  def state; self.map.state end
  def zip; self.map.zip end
  def lat; self.map.lat end
  def lng; self.map.lng end
  def full_address; self.map.full_address end
  def city_state_zip; self.map.city_state_zip end
  
  def map_data
    hash = {}
    %w(id title address city state zip lat lng).each do |attribute|
      hash.store attribute.to_sym, self.send(attribute)
    end
    hash.merge :thumb => (self.pictures.empty? ? nil : self.pictures.sort_by(&:position).first.facility_image.url(:thumb))
  end
  
  # TODO: make this work
  def self.update_stat(listings, stat, request)
    t = Time.now
    
    insert_sql = listings.map do |listing|
      "INSERT INTO #{stat} VALUES (#{listing.id}, '#{t}', '#{t}', '#{request.referrer}', '#{request.request_uri}');"
    end.join('')
    
    ActiveRecord::Base.connection.execute insert_sql
  end
  
  # create a stat record => clicks, impressions
  def update_stat stat, request
    eval "self.#{stat}.create :referrer => '#{request.referrer}', :request_uri => '#{request.request_uri}'"
  end
  
  def unit_sizes_options_array
    self.available_sizes.empty? ? SizeIcon.labels : self.available_sizes.map { |s| ["#{s.display_dimensions} #{s.title}", s.id] }.uniq
  end
  
  def available_sizes
    @available_sizes ||= self.issn_enabled? ? self.sizes.sorted.select { |size| size.unit_type.units_available? } : self.sizes.sorted
  end
  
  def available_unit_types
    self.available_sizes.map(&:title).uniq
  end
  
  def uniq_avail_sizes
    uniques = []
    self.available_sizes.each do |size|
      uniques << size unless uniques.any? { |u| u.compare_for_uniq.values == size.compare_for_uniq.values }
    end
    uniques
  end
  
  def average_rate
    return 'N/A' if self.available_sizes.empty?
    self.available_sizes.map(&:dollar_price).mean
  end
  
  def root_search
    self.searches.detect &:root?
  end
  
  def premium?
    self.client && self.client.status == 'active'
  end
  
  def unverified?
    self.client.nil? || self.client.status == 'unverified'
  end
  
  # used in the add your facility process to find listings that the client might own. First look for the facility in the city and then in the state.
  def self.find_listings_by_company_city_and_state(company, city, state)
    self.find_by_sql "SELECT l.id, l.title, m.address, m.city, m.state, m.zip FROM listings l " +
                     "LEFT JOIN maps m ON m.listing_id = l.id " +
                     "LEFT JOIN users u ON u.id = l.user_id " +
                     "WHERE ((LOWER(m.state) LIKE '%#{state}%' " +
                           "AND LOWER(m.city) LIKE '%#{city}%' " +
                           "AND LOWER(l.title) LIKE '%#{company}%') " +
                       "OR (LOWER(m.state) LIKE '%#{state}%' " +
                         "AND LOWER(l.title) LIKE LOWER('%#{company}%')) " +
                       "OR (LOWER(m.city) LIKE '%#{city}%' " +
                         "AND LOWER(l.title) LIKE LOWER('%#{company}%'))) AND l.user_id IS NULL " +
                         "ORDER BY l.title LIMIT 100"
  end
  
  # add up a score based on model methods
  # when the methods return collections, calculate the size compared to the integer in the criteria,
  # when its a single object, do the comparison and return 0 or 100
  def self.criteria
    {
      :sizes             => 5,
      :pictures          => 5,
      :facility_features => 5,
      :specials          => 3,
      :reviews           => 5,
      :description       => { :p => 5, :c => lambda { |o, p| o && o.size < 100 ? 0 : p }}, # these are boolean-like, they either get the full score or 0
      :logo              => { :p => 5, :c => lambda { |o, p| o.nil?       ? 0 : p }},
      :tracked_number    => { :p => 5, :c => lambda { |o, p| o.blank?     ? 0 : p }},
      :admin_fee         => { :p => 5, :c => lambda { |o, p| o.blank?     ? 0 : p }},
      :tax_rate          => { :p => 5, :c => lambda { |o, p| o.blank?     ? 0 : p }},
      :hours_filled_out? => { :p => 5, :c => lambda { |o, p| !o           ? 0 : p }}
    }
  end
  
  def percent_complete
    total = score = 0
    
    # perform the calculations by passing in the object returned by each method represented by the criteria keys,
    # add up and return percent of the total score, figure out total dynamically
    Listing.criteria.each do |c|
      obj, crit = self.send(c[0]), c[1]
      
      if crit.is_a?(Fixnum) # obj should be a collection
        total += crit
        score += obj.size > crit ? crit : obj.size # cap it off, so we dont get more than 100% in the final result
        
      elsif crit.is_a?(Hash)
        points, calc = crit[:p], crit[:c]
        total += points
        score += calc.call(obj, points)
      end
    end
    
    (score.to_f / total.to_f * 100).to_i
  end
  
  def call_tracking_enabled?
    true
  end
  
  def call_tracking_num
    '555-234-5678'
  end
  
  def calculated_price
    amount, paid_thru = 90, '01/31/11'
    
    { :amount => amount, :paid_thru => paid_thru}
  end
  
  #
  # OpenTech ISSN wrapper code
  #
  def accepts_rentals?
    !self.siblings.empty?
  end
  
  def issn_enabled?
    !self.facility_id.blank?
  end
  
  def has_feature?(*features)
    features.any? do |feature|
      self.facility_features.map(&:label).include? feature
    end
  end
  
  def units_available?
    self.units.any? { |u| u.Available.downcase == 'y' }
  end
  
  def facility_id
    self.facility_info.O_FacilityId if self.facility_info
  end
  
  def max_reserve_ahead_days
    self.facility_info.O_MaximumReserveAheadDays if self.facility_info
  end
  
  # args: { :type_id => str:required, :unit_id => str:optional, :promo_code => str:optional, :insurance_id => str:optional }
  def get_move_in_cost(args)
    IssnAdapter.get_move_in_cost self.facility_id, args
  end
  
  # args: { :type_id => str:required, :unit_id => str:optional, :date => str:optional }
  def get_reserve_cost(args)
    IssnAdapter.get_reserve_cost self.facility_id, args
  end
  
  def self.find_facilities(args = {})
    IssnAdapter.find_facilities args
  end
  
  # does not require extra params. methods: getStdFacilityFeatures, getStdUnitTypeFeatures, getStdUnitTypeSizes
  def self.get_standard_info(method = 'getStdFacilityFeatures')
    IssnAdapter.get_standard_info method
  end
  
  # issn methods: getFacilityInfo, getFacilityFeatures, getFacilityDataGroup, getFacilityInsurance, getFacilityPromos, getFacilityUnitTypes
  def get_facility_info(method = 'getFacilityInfo')
    IssnAdapter.get_facility_info method, self.facility_id
  end
  
  def get_facility_insurance
    IssnAdapter.get_facility_insurance self.facility_id
  end
  
  # issn method: getFacilityUnits
  def get_unit_info
    IssnAdapter.get_unit_info self.facility_id
  end
  
  # issn method: getFacilityUnitTypesFeatures
  def get_unit_features(unit_type_id = nil)
    IssnAdapter.get_unit_features self.facility_id, unit_type_id
  end
  
  def process_new_tenant(args)
    IssnAdapter.process_new_tenant(self.facility_id, args)
  end
  
  def process_tenant_payment(args)
    IssnAdapter.process_tenant_payment(self.facility_id, args)
  end
  
  #
  # Methods to sync data from the ISSN db
  #
  def self.update_standard_info
    [IssnUnitTypeSize, IssnUnitTypeFeature, IssnFacilityFeature].map &:update_from_issn
  end
  
  def update_all_issn_data
    transaction do
      update_facility_info
      sync_facility_info_with_listing
      update_unit_types_and_sizes
      update_promos_and_specials
      update_facility_insurance
    end
    
    puts "\nALL DATA UPDATED.\n"
  end
  
  def update_facility_info
    puts "\nUpdating Facility Info...\n"
    self.facility_info.nil? ? self.create_facility_info : self.facility_info.update_from_issn
  end
  
  def update_facility_insurance
    puts "\nUpdating Facility Insurance...\n"
    self.facility_insurances.empty? ? self.facility_insurances.create : self.facility_insurances.update_from_issn
  end
  
  def update_unit_types
    IssnAdapter.update_models_from_issn :class => UnitType,
                                        :data => IssnAdapter.get_facility_info('getFacilityUnitTypes', self.facility_id), 
                                        :model => self.unit_types,
                                        :find_method => 'find_by_sID',
                                        :find_attr  => 'sID'
  end
  
  def update_units
    self.unit_types.each &:update_units
  end
  
  def update_promos
    IssnAdapter.update_models_from_issn :class => Promo,
                                        :data => IssnAdapter.get_facility_promos(self.facility_id), 
                                        :model => self.promos,
                                        :find_method => 'find_by_Description',
                                        :find_attr => 'sDescription'
  end
  
  def update_unit_types_and_sizes
    puts "\nUpdating Unit Types...\n"
    update_unit_types
    update_units
    #puts "\nUpdating Unit Features...\n"
    #update_unit_features
    puts "Done.\nSyncing Units With Unit Types...\n"
    sync_units_with_unit_types
    puts "Done.\nSyncing Sizes With Unit Types...\n"
    sync_sizes_with_unit_types
    puts "Done.\nSyncing Costs With Unit Types...\n"
    sync_costs_with_unit_types
    puts "Done.\n"
    true
  end
  
  def update_promos_and_specials
    puts "\nUpdating Promos...\n"
    update_promos
    puts "\nSyncing Specials With Promos ...\n"
    sync_specials_with_promos
  end
  
  def sync_facility_info_with_listing
    puts "\nSyncing Facility Info With Listing...\n"
    @fi = self.facility_info
    transaction do
      self.update_attributes :title =>  @fi.MS_Name, :description =>  @fi.O_FacilityName
      
      Map.transaction(:requires_new => true) do
        self.map.update_attributes :address => @fi.O_Address + (" ##{@fi.O_Address2}" if @fi.O_Address2).to_s,
                                   :city => @fi.O_City,
                                   :state => @fi.O_StateOrProvince,
                                   :zip => @fi.O_PostalCode,
                                   :lat => @fi.O_IssnLatitude,
                                   :lng => @fi.O_IssnLongitude
      end
    end
  end
  
  def sync_costs_with_unit_types
    UnitType.transaction(:requires_new => true) do
      self.unit_types.map &:update_costs
    end
  end
  
  def sync_units_with_unit_types
    UnitType.transaction(:requires_new => true) do
      self.unit_types.map &:update_units
    end
  end
  
  def sync_sizes_with_unit_types
    Size.transaction(:requires_new => true) do
      self.unit_types.each do |unit_type|
        size = self.sizes.find_by_id(unit_type.size_id) || self.sizes.create
        unit_type.update_attribute :size_id, size.id
        unit_type.update_features
        
        type = unit_type.features.first.short_description
      
        args = {
          :width       => unit_type.ActualWidth,
          :length      => unit_type.ActualLength,
          :price       => unit_type.RentalRate * 100, # convert to cents (integer)
          :title       => type,
          :description => (unit_type.features.first.long_description || type)
        }
        size.update_attributes args
      end
    end
  end
  
  def sync_specials_with_promos
    Special.transaction(:requires_new => true) do
      self.promos.each do |promo|
        special = self.specials.find_by_id(promo.special_id) || self.specials.create
        promo.update_attribute :special_id, special.id
        special.update_attributes :title => promo.Description, :code => promo.Code
      end
    end
  end
  
  # for testing
  def purge_issn_data
    self.unit_types = []
    self.promos = []
    self.facility_features = []
    self.save
  end
  
  def purge_own_data
    self.sizes = []
    self.specials = []
    self.save
  end
  
end