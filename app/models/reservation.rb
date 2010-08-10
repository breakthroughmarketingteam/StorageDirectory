class Reservation < ActiveRecord::Base
  
  belongs_to :listing
  belongs_to :user
  
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
  
end
