class Reservation < ActiveRecord::Base
  
  belongs_to :listing, :counter_cache => true
  belongs_to :reserver
  belongs_to :unit_type
  
  has_many :comments
  accepts_nested_attributes_for :comments
  
  acts_as_commentable
  access_shared_methods
  
  validates_presence_of :listing_id
  validates_date :move_in_date, :after => Proc.new { -1.day.from_now.to_date }, :after_message => 'must be after %s'
  validates_date :move_out_date, :after => Proc.new { 2.weeks.from_now.to_date }, :after_message => 'should be at least two weeks from now, on %s' 
  
  def process_new_tenant(billing_info)
    if self.listing.accepts_reservations?
      usa = 'United States of America'
      args = {
        :type_id            => self.unit_type.sID,
        :reserve_until_date => IssnAdapter.parse_date_to_YMD(self.reserve_until_date),
        :pay_months         => 0,
        :tenant => {
          :first_name => self.reserver.first_name,
          :last_name  => self.reserver.last_name,
          :address    => self.reserver.mailing_address.address,
          :address2   => '',
          :city       => self.reserver.mailing_address.city,
          :state      => self.reserver.mailing_address.state,
          :zip        => self.reserver.mailing_address.zip,
          :country    => usa,
          :home_phone => self.reserver.mailing_address.phone,
          :email      => self.reserver.email,
          :billing => {
            :address  => self.reserver.billing_info.address,
            :address2 => '',
            :city     => self.reserver.billing_info.city,
            :state    => self.reserver.billing_info.state,
            :zip      => self.reserver.billing_info.zip,
            :country  => usa
          },
          :alt => {},
          :military => {},
        },
        :pay_type => 'CC',
        :credit_card => {
          :type         => billing_info.card_type,
          :name_on_card => billing_info.name,
          :number       => billing_info.card_number,
          :zip          => billing_info.zip,
          :ccv          => billing_info.ccv,
          :expires => {
            :month => billing_info.expires_month,
            :year  => billing_info.expires_year
          }
        },
        :bank => {},
        :check_number => '',
        :amount_to_apply => '20'
      }
      
      response = self.listing.process_new_tenant args
      
      if response['sErrorMessage'].blank?
        self.update_attribute :reserve_code, response['sReservationCode']
        self.update_attribute :response, response
      end
      
      response
    end
  end
  
  def name
    self.reserver.name rescue 'name missing'
  end
  
  def unit_description
    "#{self.unit_type.size.display_dimensions} #{self.unit_type.size.description}"
  end
  
  def fee
    self.unit_type.reserve_cost.total_cost
  end
  
  def duration
    @distance_in_minutes ||= (((self.move_out_date.to_time - self.move_in_date.to_time).abs) / 60).round
    @month_range ||= (@distance_in_minutes.to_f / 43200.0).round
  end
  
  def reserve_until_date
    self.move_in_date + 2.weeks
  end
  
  def nice_move_in_date
    self.move_in_date.strftime "%A, %B %e"
  end
  
  def nice_move_out_date
    self.move_out_date.strftime "%A, %B %e"
  end
  
  def active?
    now = Time.now
    self.move_in_date <= now && self.move_out_date > now
  end
  
  def expired?
    self.move_out_date < Time.now
  end
  
  def comment
    self.comments.first
  end
  
  def partial_link
    "/ajax/get_partial?partial=reservations/detail&model=Reservation&id=#{self.id}"
  end
  
end
