class Client < User
  
  has_many :listings, :foreign_key => 'user_id'
  has_many :billing_infos, :dependent => :destroy
  accepts_nested_attributes_for :listings, :mailing_addresses, :billing_infos
  has_one :settings, :class_name => 'AccountSetting', :dependent => :destroy
  has_one :listing_description
  accepts_nested_attributes_for :settings, :listing_description
  
  def initialize(params = {})
    super params
    self.role_id = Role.get_role_id 'advertiser'
  end

  def active_mailing_address
    self.mailing_addresses.last
  end
  
  def active_billing_info
    self.billing_infos.last
  end
  
  #def listing_description
    #self.listing_descriptions.find :last, :conditions => { :listing_id => nil }
  #end
  
  def has_mailing_address?
    !active_mailing_address.nil?
  end
  
  def has_billing_info?
    !active_billing_info.nil?
  end
  
  def update_info(info) 
    if info[:settings_attributes]
      settings = self.settings || self.build_settings(info[:settings_attributes])
      settings.new_record? ? settings.save : settings.update_attributes(info[:settings_attributes])
    end
    
    if info[:listing_description_attributes]
      listing_description = self.listing_description || self.build_listing_description(info[:listing_description_attributes])
      listing_description.new_record? ? listing_description.save : listing_description.update_attributes(info[:listing_description_attributes])
    end

    if info[:mailing_address]
      mailing_address = self.active_mailing_address || self.mailing_addresses.build(info[:mailing_address])
      mailing_address.new_record? ? mailing_address.save : mailing_address.update_attributes(info[:mailing_address])
    end
  
    if info[:billing_info]
      billing_info = self.active_billing_info || self.billing_infos.build(info[:billing_info])
      billing_info.new_record? ? billing_info.save : billing_info.update_attributes(info[:billing_info])
    end
    self.save
  end
  
  def enable_listings!
    self.listings.each { |listing| listing.update_attributes :enabled => true }
  end
  
  # a simple listing search for the add your facility page
  def potential_listings
    Listing.find :all, :conditions => ['title LIKE ?', self.company]
  end
  
  def issn_enabled?
    self.listings.any? &:issn_enabled?
  end
  
  def call_tracking_enabled?
    false
  end
  
  def issn_enabled_listings
    self.listings.select &:issn_enabled?
  end
  
  def reservations
    self.listings.map(&:reservations).flatten
  end
  
  # generate an array of plot points
  def get_stats_for_graph(stats_models, start_date, end_date)
    # get date arrays => [year, month, day]
    sd, ed = Time.parse(start_date).to_a[3,3].reverse, Time.parse(end_date).to_a[3,3].reverse
    date_range = Date.new(sd[0], sd[1], sd[2])..Date.new(ed[0], ed[1], ed[2])
    plot_data = {}; counts = []
    
    stats_models.each do |stat|
      stats = eval <<-RUBY
        self.listings.map do |listing| 
          listing.#{stat}.all(:conditions => ['created_at >= ? AND created_at <= ?', sd * '-', ed * '-'], :order => 'created_at')
        end.flatten
      RUBY
      
      date_range.each do |date|
        d = Time.parse(date.to_s).to_a[3,3]
        # select the stats models that were created on the same year, month, day
        stat_count = stats.select { |s| s.created_at.to_a[3,3][2] == d[2] && s.created_at.to_a[3,3][1] == d[1] && s.created_at.to_a[3,3][0] == d[0] }.size
        counts << stat_count
        (plot_data[stat.to_sym] ||= []) << [date.to_s, stat_count]
      end
    end
    
    { :data => plot_data, :min => counts.min, :max => counts.max }
  end
  
  def issn_test(facility_id, enable)
    @listing = self.listings.first
    
    if @listing
      @listing.purge_issn_data
      @listing.purge_own_data
      @facility_info = @listing.facility_info || @listing.create_facility_info
      
      if enable
        @facility_info.update_attribute :O_FacilityId, facility_id
        @facility_info.listing.update_all_issn_data
      else
        @facility_info.update_attribute :O_FacilityId, nil
      end
      
      return true
    end
    
    return false
  end
  
end