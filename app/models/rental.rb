class Rental < ActiveRecord::Base
  
  belongs_to :tenant
  belongs_to :listing, :touch => true
  belongs_to :size
  belongs_to :special
  
  access_shared_methods
  
  @@searchables = %w(first_name last_name email)
  cattr_reader :searchables
  
  def paid_through
    t = self.move_in_date
    t = Time.gm t.year, t.month
    t + self.duration.to_i.months
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
  
end
