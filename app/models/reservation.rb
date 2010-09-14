class Reservation < ActiveRecord::Base
  
  belongs_to :listing, :counter_cache => true
  belongs_to :user
  belongs_to :unit_type
  
  has_many :comments
  accepts_nested_attributes_for :comments
  
  acts_as_commentable
  access_shared_methods
  
  def name
    self.user.name
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
