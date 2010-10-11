class InfoRequest < ActiveRecord::Base
  
  belongs_to :listing
  validates_presence_of :name, :email, :phone, :duration, :move_in_date
  
end
