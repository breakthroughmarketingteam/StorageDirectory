class Reservation < ActiveRecord::Base
  
  belongs_to :listing, :counter_cache => true
  belongs_to :user
  belongs_to :unit_type
  
  has_many :comments
  accepts_nested_attributes_for :comments
  
  acts_as_commentable
  access_shared_methods
  
  validates_presence_of :listing_id, :user_id, :status
  validates_date :move_in_date, :after => Date.new(Time.now.year, Time.now.month, Time.now.day), :after_message => 'must be after %s'
  validates_date :move_out_date, :after => Proc.new { 1.month.from_now.to_date }, :after_message => 'should be at least a month from now, on %s'
  
  after_create :process_new_tenant
  
  def before_validation
    errors.add_to_base "Sorry, a #{self.unit_type.size.display_dimensions} #{self.unit_type.size.title} is not available." unless self.unit_type.units_available?
  end
  
  def process_new_tenant
    if self.listing.accepts_reservations?
      usa = 'United States of America'
      args = {
        :type_id            => self.unit_type.sID,
        :reserve_until_date => IssnAdapter.parse_date_to_YMD(self.reserve_until_date),
        :pay_months         => 0,
        :tenant => {
          :first_name => self.user.first_name,
          :last_name  => self.user.last_name,
          :address    => self.user.mailing_address.address,
          :address2   => '',
          :city       => self.user.mailing_address.city,
          :state      => self.user.mailing_address.state,
          :zip        => self.user.mailing_address.zip,
          :country    => usa,
          :home_phone => self.user.mailing_address.phone,
          :email      => self.user.email,
          :billing => {
            :address  => '',
            :address2 => '',
            :city     => '',
            :state    => '',
            :zip      => '',
            :country  => usa
          }
        },
        :pay_type => 'Credit Card',
        :credit_card => {
          :type         => '',
          :name_on_card => '',
          :number       => '',
          :zip          => '',
          :ccv          => '',
          :expires => {
            :month => '',
            :year  => ''
          }
        }, 
        :amount_to_apply => self.unit_type
      }
      self.listing.process_new_tenant self.listing.facility_id, args
    end
  end
  
  def name
    self.user.name
  end
  
  def month_range
    @distance_in_minutes ||= (((self.move_out_date.to_time - self.move_in_date.to_time).abs) / 60).round
    @month_range ||= (@distance_in_minutes.to_f / 43200.0).round
  end
  
  def reserve_until_date
    self.move_in_date + 2.weeks
  end
  
  def nice_start_date
    "#{self.start_date.day} #{self.start_date.month}"
  end
  
  def nice_end_date
    "#{self.end_date.day} #{self.end_date.month}"
  end
  
  def duration
    self.end_date - self.start_date
  end
  
  def active?
    now = Time.now
    self.start_date <= now && self.end_date > now
  end
  
  def expired?
    self.end_date < Time.now
  end
  
end
