class Rental < ActiveRecord::Base
  
  belongs_to :tenant
  belongs_to :listing, :touch => true
  belongs_to :size
  belongs_to :special, :class_name => 'PredefinedSpecial', :foreign_key => 'special_id'
  
  validates_presence_of :tenant_id, :listing_id, :size_id, :paid_thru, :move_in_date
  validates_numericality_of :subtotal, :savings, :tax_amt, :total
  
  access_shared_methods
  
  @@searchables = %w(first_name last_name email)
  cattr_reader :searchables
  
  def validate
  	errors.add(:move_in_date, 'is out of range. Must be within 15 days.') unless move_in_date.between? 1.day.ago, 15.days.from_now
  end
  
  def paid_through
    t = self.move_in_date
    t = Time.gm t.year, t.month
    t + self.duration.to_i.months
  end

  def conf_num
    "#{self.id}-#{self.tenant.id}"
  end
  
  def title
    self.tenant.name
  end
  
  def first_name
    self.tenant.first_name
  end
  
  def last_name
    self.tenant.last_name
  end
  
  def email
    self.tenant.email
  end
  
  def nice_move_in_date
    self.move_in_date.strftime '%B %d, %Y' if self.move_in_date
  end
  
  def nice_paid_thru
    self.paid_thru.strftime '%B %d, %Y' if self.paid_thru
  end
  
  def apply_savings!(params)
    d = (params[:discount] || 0).to_f
    u = self.fallback_calc_discount
    self.savings = u + d
  end
  
  def fallback_calc_discount
    self.size.dollar_price * $_usssl_percent_off
  end
  
end
