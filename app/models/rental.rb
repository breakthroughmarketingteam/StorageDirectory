class Rental < ActiveRecord::Base
  
  belongs_to :tenant
  belongs_to :listing
  belongs_to :size
  belongs_to :special
  
  def paid_through
    t = self.move_in_date
    t = Time.gm t.year, t.month
    t + self.duration.months
  end
  
end
