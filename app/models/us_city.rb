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
  
end
