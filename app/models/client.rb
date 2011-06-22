class Client < User
  
  has_one :settings, :class_name => 'AccountSetting', :dependent => :destroy
  has_one :billing_info, :as => :billable, :dependent => :destroy
  has_one :mailing_address, :dependent => :destroy, :foreign_key => 'user_id'
  has_one :payment_plan_assign, :dependent => :destroy
  has_one :payment_plan, :through => :payment_plan_assign
  
  has_many :listings, :foreign_key => 'user_id' do
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
  
  accepts_nested_attributes_for :listings, :mailing_address, :billing_info, :payment_plan_assign
  
  named_scope :opted_in, :conditions => 'wants_newsletter IS TRUE'
  named_scope :activated, :conditions => { :status => 'active' }, :order => 'activated_at DESC'
  named_scope :inactive, :conditions => ['status != ?', 'active'], :order => 'created_at DESC'
  
  @@attribute_order << 'billing_status'
  @@editable_attr | %w(billing_status report_recipients company)
  
  access_shared_methods
  acts_as_nested_set # to have sub users "managers"
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
  
  def before_create
    self.mailing_address.name    = self.name
    self.mailing_address.company = self.company
  end
  
  def initialize(params = {})
    unless params.blank?
      super params[:client]
      
      if params[:listings]
        self.listing_ids = params[:listings]
      else
        self.listings.build({
          :title           => self.company, 
          :status          => 'unverified', 
          :category        => 'Storage', 
          :storage_types   => 'self storage', 
          :address         => params[:client][:mailing_address_attributes][:address], 
          :city            => params[:client][:mailing_address_attributes][:city], 
          :state           => params[:client][:mailing_address_attributes][:state], 
          :zip             => params[:client][:mailing_address_attributes][:zip], 
          :phone           => params[:client][:mailing_address_attributes][:phone],
          :renting_enabled => params[:client][:rental_agree]
        })
      end
      
      self.user_hints = UserHint.all
    else
      super params[:client]
    end
    
    self.role_id           = Role.get_role_id 'advertiser'
    self.report_recipients = self.email
    self.trial_days        = USSSL_TRIAL_DAYS
    self.billing_status    = 'free'
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

  def update_info(info, billing_update = false)
    self.merge_editable_with_params info, @@editable_attr if info[:email]
    
    sets = info.delete(:settings)
    if sets
      settings = self.settings || self.build_settings(sets)
      settings.new_record? ? settings.save : settings.update_attributes(sets)
    end
    
    self.mailing_address_attributes = info.delete(:mailing_address_attributes) if info[:mailing_address_attributes]
    self.build_and_process_billing_info info, billing_update, :billing_amount => self.billing_amount
    
    if info[:password]
      self.password = info[:password]
      self.password_confirmation = info[:password_confirmation]
    end
    
    self.errors.empty? && self.save
  end
  
  def merge_editable_with_params(params, editable)
    params.each do |key, val|
      self.send :"#{key}=", val if editable.include? key
    end
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
  
  def stats_cache_key
    "ClientStatsKey-#{self.id}"
  end
  
  def stats_cache_expiry
    factor = self.listings.size < 10 ? 10 : self.listings.size
    (factor * 7).minutes
  end
  
  def generate_client_stats(params)
    stats = self.get_stats_for_graph params[:stats_models], params[:start_date], params[:end_date]
    Rails.cache.write self.stats_cache_key, stats, :expires_in => self.stats_cache_expiry
  end
  
  # generate an array of plot points
  def get_stats_for_graph(stats_models, start_date, end_date, listing_id = nil)
    # get date arrays => [year, month, day]
    sd, ed     = Time.parse(start_date).to_a[3,3].reverse, Time.parse(end_date).to_a[3,3].reverse
    date_range = Date.new(*sd)..Date.new(*ed)
    plot_data  = {}
    counts     = []
    conditions = { :conditions => ['created_at >= ? AND created_at <= ?', sd.join('-'), ed.join('-')], :order => 'created_at' }
    
    stats_models.split(/,\W?/).each do |stat|
      stats = unless listing_id.nil?
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
  
  def send_billing_notifications(billing, invoice, starting = true)
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