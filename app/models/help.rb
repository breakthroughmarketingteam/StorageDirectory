class Help < ActiveRecord::Base
  
  access_shared_methods
  ajaxful_rateable
  
  def self.find_available(title = '')
    find_by_title(title) || find_by_title('Help Not Yet Available')
  end
  
end
