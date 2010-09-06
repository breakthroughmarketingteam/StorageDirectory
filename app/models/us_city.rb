class UsCity < ActiveRecord::Base
  
  def self.states
    all(:select => 'DISTINCT state', :order => 'state').map(&:state)
  end
  
  def self.names
    all(:select => 'DISTINCT name', :order => 'name').map(&:name).reject(&:nil?)
  end
  
  def self.states_by_letter(a)
    all(:select => 'DISTINCT state', :conditions => "LOWER(state) LIKE '#{a.downcase}%'", :order => 'state').map(&:state)
  end
  
  def self.cities_of(state)
    all(:select => 'name', :conditions => ['LOWER(state) = ?', state.downcase.gsub('-', ' ')], :order => 'name').map(&:name)
  end
  
  # converts the list of cities into a hash: { first_letter: [city_names...], etc... }
  def self.tabbed_cities_of(state)
    tabbed = {}
    cities_of(state).each do |city|
      tabbed[city[0,1]] ||= []
      tabbed[city[0,1]] << city
    end
    tabbed.sort
  end
  
end
