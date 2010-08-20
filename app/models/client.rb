class Client < User

  has_many :listings, :foreign_key => 'user_id'
  has_many :billing_infos, :dependent => :destroy
  accepts_nested_attributes_for :listings, :mailing_addresses, :billing_infos
  
  def accepts_reservations?
    false
  end
  
  def active_mailing_address
    self.mailing_addresses.first
  end
  
  def active_billing_info
    self.billing_infos.first
  end
  
  def has_mailing_address?
    !active_mailing_address.nil?
  end
  
  def has_billing_info?
    !active_billing_info.nil?
  end
  
  def update_info(info)
    mailing_address = self.active_mailing_address || self.mailing_addresses.build
    billing_info = self.active_billing_info || self.billing_infos.build
    mailing_address.update_attributes(info[:mailing_address]) && billing_info.update_attributes(info[:billing_info])
  end
  
  def potential_listings
    Listing.find :all, :conditions => ['title LIKE ?', self.company]
  end
  
  def get_stats_for_graph(stats_models, start_date, end_date)
    start_date, end_date = Time.parse(start_date).to_a[3,3].reverse, Time.parse(end_date).to_a[3,3].reverse
    start_month_days, end_month_days = days_in_month(start_date[2], start_date[1]), days_in_month(end_date[2], end_date[1])
    data = []
    
    stats_models.each do |stat|
      stats = eval <<-RUBY
        self.listings.map do |listing| 
          listing.#{stat}.all(:conditions => ['created_at >= ? AND created_at <= ?', start_date * '-', end_date * '-'], :order => 'created_at')
        end.flatten
      RUBY
      
      raise stats.pretty_inspect
      stats.each do |s|
        
      end
    end
  end
  
  def days_in_month(year, month)
    (Date.new(year, 12, 31) << (12-month)).day
  end
  
end