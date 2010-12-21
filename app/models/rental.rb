class Rental < ActiveRecord::Base
  
  belongs_to :tenant
  belongs_to :listing, :touch => true
  belongs_to :size
  belongs_to :special
  
  access_shared_methods
  
  def paid_through
    t = self.move_in_date
    t = Time.gm t.year, t.month
    t + self.duration.to_i.months
  end
  
  def title
    self.tenant.name
  end
  
end
