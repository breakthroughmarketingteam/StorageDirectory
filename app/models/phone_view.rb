class PhoneView < ActiveRecord::Base
  belongs_to :listing, :counter_cache => true
end