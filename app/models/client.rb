class Client < User
  
  has_one :settings, :class_name => 'AccountSetting', :dependent => :destroy
  has_one :billing_info, :as => :billable, :dependent => :destroy
  has_one :mailing_address, :dependent => :destroy, :foreign_key => 'user_id'
  
  has_many :listings, :dependent => :destroy, :foreign_key => 'user_id' do
    def billable() all.select { |l| l.billing_info.nil? } end
  end
  has_many :claimed_listings, :dependent => :destroy
  has_many :enabled_listings, :class_name => 'Listing', :foreign_key => 'user_id', :conditions => 'enabled IS TRUE'
  has_many :disabled_specials, :class_name => 'Special', :conditions => 'enabled IS FALSE'
  has_many :staff_emails, :through => :listings
  has_many :sizes, :through => :listings
  has_many :rentals, :through => :listings
  has_many :specials, :through => :listings
  has_many :pictures, :through => :listings
  has_many :staff_emails, :through => :listings
  has_many :notes, :foreign_key => 'user_id', :order => 'created_at DESC'
  
  accepts_nested_attributes_for :listings, :mailing_address, :billing_info
  named_scope :opted_in, :conditions => "wants_newsletter IS TRUE OR (status = 'unverified' AND wants_newsletter IS NOT NULL AND wants_newsletter IS TRUE)"
  named_scope :activated, :conditions => { :status => 'active' }, :order => 'activated_at DESC'
  named_scope :inactive, :conditions => ['status != ?', 'active'], :order => 'created_at DESC'
  
  # billing depends on number of listings in the client account
  # 1-10, 11-25, 26+
  def self.billing_tiers
    {
      1..10     => 54.50,
      11..25    => 49.50,
      26..999999 => 44.50
    }
  end
  
  def billing_tier
    @billing_tier ||= begin
      num = self.listings.billable.size
      amount = 0
      self.class.billing_tiers.each do |range, amt|
        if range.include? num
          amount = amt
          break
        end
      end
      amount
    end
  end
  
  def billing_amount
    @billing_amount ||= sprintf('%.2f', self.billing_tier * self.listings.billable.size.to_f)
  end
  
  def initialize(params = {})
    super params[:client]
    
    unless params.blank? 
      ma = self.build_mailing_address((params[:mailing_address] || {}).merge(:name => self.name, :company => self.company))
    
      unless params[:listings].blank?
        self.listing_ids = params[:listings]
      else
        listing = self.listings.build :title         => self.company, 
                                      :status        => 'unverified', 
                                      :category      => 'Storage', 
                                      :storage_types => 'self storage', 
                                      :address       => ma.address, 
                                      :city          => ma.city, 
                                      :state         => ma.state, 
                                      :zip           => ma.zip, 
                                      :phone         => ma.phone,
                                      :renting_enabled => params[:client][:rental_agree]
      end
    
      self.role_id           = Role.get_role_id 'advertiser'
      self.report_recipients = self.email
      self.user_hints        = UserHint.all
    end
    
    self.type = self.class.name # for some reason rails doesn't automagically set this like its supposed to!
    self
  end
  
  def self.active_count
    self.count :conditions => { :status => 'active' }
  end
  
  def self.unverified_count
    self.count :conditions => ['status != ?', 'active']
  end
  
  def activate!
    self.status = 'active'
    self.activated_at = Time.now
    self.enable_listings!
    self.save
  end
  
  def active?
    self.status == 'active'
  end
  
  def display_special
    self.special && self.special.title ? self.special.title : 'No Specials'
  end
  
  def special
    @special ||= self.predefined_specials.last
  end
  
  def active_specials
    @active_specials ||= begin
      a = self.specials | self.predefined_specials
      a.sort_by { |s| s.respond_to?(:position) ? s.position : s.get_assign(self.id).position }
    end
  end
  
  def listings_verified?
    self.listings.all? &:verified?
  end

  def update_info(info)
    sets = info.delete(:settings)
    if sets
      settings = self.settings || self.build_settings(sets)
      settings.new_record? ? settings.save : settings.update_attributes(sets)
    end
    
    self.mailing_address_attributes = info.delete(:mailing_address_attributes) if info[:mailing_address_attributes]
    self.billing_info_attributes = info.delete(:billing_info_attributes) if info[:billing_info_attributes]
    
    if info[:password]
      self.password = info[:password]
      self.password_confirmation = info[:password_confirmation]
    end
    
    self.save
  end

  def enable_listings!
    self.listings.each do |listing|
      listing.enabled = true
      listing.status = 'verified'
      listing.renting_enabled = self.rental_agree?
      listing.save
    end
  end
  
  def ensure_listings_unverified!
    self.listings.each { |listing| listing.update_attribute :status, 'unverified' }
  end
  
  # a simple listing search for the add your facility page
  def potential_listings
    Listing.find :all, :conditions => ['title LIKE ?', self.company]
  end
  
  def issn_enabled?
    self.listings.any? &:issn_enabled?
  end
  
  def issn_id
    "NM-#{self.id}"
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
    date_range = Date.new(*sd)..Date.new(*ed)
    plot_data = {}; counts = []
    
    stats_models.each do |stat|
      stats = self.listings.map do |listing| 
        listing.send(stat).all(:conditions => ['created_at >= ? AND created_at <= ?', sd.join('-'), ed.join('-')], :order => 'created_at')
      end.flatten
      
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