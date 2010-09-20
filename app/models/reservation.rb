class Reservation < ActiveRecord::Base
  
  belongs_to :listing, :counter_cache => true
  belongs_to :reserver
  belongs_to :unit_type
  
  has_many :comments
  accepts_nested_attributes_for :comments
  
  acts_as_commentable
  access_shared_methods
  
  validates_presence_of :listing_id
  validates_date :move_in_date, :after => Date.new(Time.now.year, Time.now.month, Time.now.day), :after_message => 'must be after %s'
  validates_date :move_out_date, :after => Proc.new { 2.weeks.from_now.to_date }, :after_message => 'should be at least two weeks from now, on %s' 
  
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
          },
          :alt => {},
          :military => {},
        },
        :pay_type => 'CC',
        :credit_card => {
          :type         => 'Visa',
          :name_on_card => '',
          :number       => '',
          :zip          => '',
          :ccv          => '',
          :expires => {
            :month => '',
            :year  => ''
          }
        },
        :bank => {},
        :check_number => '',
        :amount_to_apply => '20'
      }
      self.listing.process_new_tenant args
    end
  end
  
  def name
    self.user.name
  end
  
  def unit_description
    "#{self.unit_type.size.display_dimensions} #{self.unit_type.size.description}"
  end
  
  def fee
    self.unit_type.reserve_cost.total_cost
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
