class InfoRequest < ActiveRecord::Base
  
  belongs_to :listing, :counter_cache => true
  belongs_to :size
  
  validates_presence_of :name, :email, :phone, :duration, :move_in_date
  access_shared_methods
  
  def validate
  	errors.add(:move_in_date, 'is out of range. Must be within 15 days.') unless move_in_date.between? 1.day.ago, 15.days.from_now
  end
  
  def deliver_emails
    Notifier.deliver_new_info_request_alert         self.listing, self # to info@usselfstoragelocator.com
    Notifier.deliver_info_request_user_notification self.listing, self # to requester
    Notifier.deliver_info_request_client_notification(self.listing, self) if self.listing.premium? # to facility
  end
  
  def title
    "#{self.name} to #{self.listing.title}"
  end
  
  def content
    "From: #{self.name} <#{self.email}>;\n"+
    "To:"
  end
  
  def nice_move_in_date
    self.move_in_date.strftime '%B %d, %Y' if self.move_in_date
  end
  
end
