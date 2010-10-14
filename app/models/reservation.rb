class Reservation < ActiveRecord::Base
  
  belongs_to :listing, :counter_cache => true
  belongs_to :reserver
  belongs_to :size
  
  acts_as_commentable
  access_shared_methods
  
  validates_presence_of :listing_id
  validates_date :move_in_date, :after => Proc.new { -1.day.from_now.to_date }, :after_message => 'must be after %s'
  
  def validate
    unless self.listing.max_reserve_ahead_days.blank?
      if self.move_in_date >= self.listing.max_reserve_ahead_days.days.from_now
        errors.add_to_base "This facility only allows you to make a reservation #{self.listing.max_reserve_ahead_days} days in advance"
      end
    end
  end
  
  def process_new_tenant(billing_info)
    usa = 'United States of America'
    args = {
      :type_id            => self.size.unit_type.sID,
      :reserve_until_date => IssnAdapter.parse_date_to_YMD(self.reserve_until_date),
      :pay_months         => 0,
      :tenant => {
        :first_name => self.reserver.first_name,
        :last_name  => self.reserver.last_name,
        :address    => billing_info.address,
        :address2   => '',
        :city       => billing_info.city,
        :state      => billing_info.state,
        :zip        => billing_info.zip.to_s,
        :country    => usa,
        :home_phone => '',
        :email      => self.reserver.email,
        :billing => {
          :address  => billing_info.address,
          :address2 => '',
          :city     => billing_info.city,
          :state    => billing_info.state,
          :zip      => billing_info.zip.to_s,
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
        :zip          => billing_info.zip.to_s,
        :ccv          => billing_info.ccv.to_s,
        :expires => {
          :month => billing_info.expires_month,
          :year  => billing_info.expires_year
        }
      },
      :bank => {},
      :check_number => '',
      :amount_to_apply => self.fee.to_s + '0'
    }
    puts args.pretty_inspect
    response = self.listing.process_new_tenant args
    
    if response['sErrorMessage'].blank? || response['sErrorMessage'] =~ /(Account Created)/i
      self.update_attribute :reserve_code, response['sReservationCode']
      self.update_attribute :response, response.to_query
    end
    
    response
  end
  
  def name
    self.reserver.name rescue 'Name missing'
  end
  
  def unit_size
    self.size ? self.size.display_dimensions : self.unit_type_size
  end
  
  def unit_description
    self.size.description
  end
  
  def fee
    self.size.unit_type.reserve_cost.total_cost
  end
  
  def reserve_until_date
    self.move_in_date + 2.weeks
  end
  
  def nice_move_in_date
    self.move_in_date.strftime "%B, %d %Y"
  end
  
  # TODO: fix this
  def active?
    now = Time.now
    self.move_in_date <= now && self.move_out_date > now
  end
  
  # TODO: fix this
  def expired?
    self.move_out_date < Time.now
  end
  
  def partial_link
    "/ajax/get_partial?partial=reservations/detail&model=Reservation&id=#{self.id}"
  end
  
end
