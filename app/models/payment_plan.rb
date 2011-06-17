class PaymentPlan < ActiveRecord::Base
  
  has_many :payment_plan_assigns, :dependent => :destroy
  has_many :clients, :through => :payment_plan_assigns
  
  access_shared_methods
  validates_presence_of :title, :price, :recurs
  validates_numericality_of :price, :recurs
  
  named_scope :sorted, :order => 'recurs ASC'
  
  def description
    "Every #{self.recurs == 1 ? 'Month' : "#{self.recurs} Months"} ($#{self.nice_price}/m)"
  end
  
  def nice_price
    sprintf '%.2f', self.price
  end
  
  def recurring_cost
    sprintf '%.2f', self.recurs.to_f * self.price
  end
  
end
