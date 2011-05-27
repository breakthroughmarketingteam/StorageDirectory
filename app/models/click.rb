class Click < ActiveRecord::Base
  belongs_to :listing, :counter_cache => true, :touch => true
end
