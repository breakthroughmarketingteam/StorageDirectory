class InfoRequest < ActiveRecord::Base
  
  belongs_to :listing
  validates_presence_of :name, :email, :phone, :duration, :move_in_date
  access_shared_methods
  
  def title
    "#{self.name} to #{self.listing.title}"
  end
  
  def content
    "From: #{self.name} <#{self.email}>;\n"+
    "To:"
  end
  
end
