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
  has_many :unsubs, :as => 'subscriber', :dependent => :destroy
  
  accepts_nested_attributes_for :listings, :mailing_address, :billing_info
  named_scope :opted_in, :conditions => "wants_newsletter IS TRUE OR (status = 'unverified' AND wants_newsletter IS NOT NULL AND wants_newsletter IS TRUE)"
  named_scope :activated, :conditions => { :status => 'active' }, :order => 'activated_at DESC'
  named_scope :inactive, :conditions => ['status != ?', 'active'], :order => 'created_at DESC'
  
  acts_as_nested_set
  acts_as_gotobillable :merchant_id    => ::GTB_MERCHANT[:id], 
                       :merchant_pin   => ::GTB_MERCHANT[:pin], 
                       :ip_address     => ::SERVER_IP,
                       :debug          => (RAILS_ENV == 'development' ? '1' : '0')

  # figure out how much to charge a client based on the product of the amount of units in use (e.g. billable listings) 
  # and the amount to charge per unit (e.g. 1-10 listings are 54.50 each, 11-25 are 49.50...)
  def billing_amount
    sprintf('%.2f', self.billing_tier * self.tier_multiple)
  end

  # the amount to charge per unit
  # set gtb_settings[:billing_tiers] to a hash where the keys are a range and the value is the amount
  def billing_tier
    amount = 0
    { 1..10 => 54.50, 11..25 => 49.50, 26..999999 => 44.50 }.each do |range, amt|
      amount = amt and break if range.include? self.tier_multiple
    end
    amount
  end

  # the tier_multiple is the amount of units in use by the client
  def tier_multiple
    b = self.listings.billable
    b.size == 0 ? 1 : b.size
  end
  
  def initialize(params = {})
    super params[:client]
    
    unless params.blank? 
      ma = self.build_mailing_address((params[:mailing_address] || {}).merge(:name => self.name, :company => self.company))
    
      unless params[:listings].blank?
        self.listing_ids = params[:listings]
      else
        listing = self.listings.build({
          :title         => self.company, 
          :status        => 'unverified', 
          :category      => 'Storage', 
          :storage_types => 'self storage', 
          :address       => ma.address, 
          :city          => ma.city, 
          :state         => ma.state, 
          :zip           => ma.zip, 
          :phone         => ma.phone,
          :renting_enabled => params[:client][:rental_agree]
        })
      end
    
      self.role_id           = Role.get_role_id 'advertiser'
      self.report_recipients = self.email
      self.user_hints        = UserHint.all
    end
    
    self.trial_days     = USSSL_TRIAL_DAYS
    self.billing_status = 'free'
    self.type           = self.class.name # for some reason rails doesn't automagically set this like its supposed to!
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
    self.enabled_listings.all? &:verified?
  end

  def update_info(info)
    sets = info.delete(:settings)
    if sets
      settings = self.settings || self.build_settings(sets)
      settings.new_record? ? settings.save : settings.update_attributes(sets)
    end
    
    self.mailing_address_attributes = info.delete(:mailing_address_attributes) if info[:mailing_address_attributes]
    
    if info[:billing_info_attributes]
      bi = info.delete(:billing_info_attributes)
      
      if self.billing_info.nil?
        self.build_billing_info bi
        self.process_billing_info!(self.billing_info, :billing_amount => self.billing_amount) if self.billing_info.save
      else
        old_billing = self.billing_info
        
        if self.billing_info.update_attributes bi
          new_billing = self.billing_info.reload
          self.update_previous_transaction! old_billing, new_billing, !self.listings.billable.empty?
        end
      end
    end
    
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
  
  def listings_cities
    self.enabled_listings.map{ |l| l.city_and_state.join ', ' }.uniq
  end
  
  def trial_days_left
    self.trial_days - (Time.now.to_date - self.created_at.to_date).to_i
  end
  
  def trial_days_left_interval
    if self.trial_days_left.between? 0, 5
      5
    elsif self.trial_days_left.between? 6, 10
      10
    elsif self.trial_days_left.between? 11, 15
      15
    else
      1
    end
  end
  
  def expires_date
    (self.created_at.to_date + self.trial_days).strftime '%B %d, %Y'
  end
  
  def unsub_url_for(list)
    "https://#{USSSL_DOMAIN}/unsub?list=#{list}&class_name=Client&email=#{self.email}"
  end
  
  def cancel_billing!
    self.delete_pending_transactions! self.billing_info
  end
  
  # generate an array of plot points
  def get_stats_for_graph(stats_models, start_date, end_date, listing_id = nil)
    # get date arrays => [year, month, day]
    sd, ed = Time.parse(start_date).to_a[3,3].reverse, Time.parse(end_date).to_a[3,3].reverse
    date_range = Date.new(*sd)..Date.new(*ed)
    plot_data = {}; counts = []
    conditions = { :conditions => ['created_at >= ? AND created_at <= ?', sd.join('-'), ed.join('-')], :order => 'created_at' }
    
    stats_models.each do |stat|
      stats = if !listing_id.blank?
        self.listings.find(listing_id).send(stat).all conditions
      else
        self.listings.map { |listing| listing.send(stat).all conditions }.flatten
      end
      
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
  
  def send_billing_notifications(billing, invoice, starting)
    if starting # billing info saved
      Notifier.deliver_billing_processed_alert self, billing, invoice
      Notifier.deliver_billing_processed_notification self, billing, invoice
    else # billing canceled
      Notifier.deliver_billing_removed_alert self, billing, invoice
      Notifier.deliver_billing_removed_notification self, billing, invoice
    end
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