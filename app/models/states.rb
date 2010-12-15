class States
  NAMES = [
    [ "Alabama", "AL" ], 
    [ "Alaska", "AK" ], 
    [ "Arizona", "AZ" ], 
    [ "Arkansas", "AR" ], 
    [ "California", "CA" ], 
    [ "Colorado", "CO" ], 
    [ "Connecticut", "CT" ], 
    [ "Delaware", "DE" ], 
    [ "District Of Columbia", "DC" ], 
    [ "Florida", "FL" ], 
    [ "Georgia", "GA" ], 
    [ "Hawaii", "HI" ], 
    [ "Idaho", "ID" ], 
    [ "Illinois", "IL" ], 
    [ "Indiana", "IN" ], 
    [ "Iowa", "IA" ], 
    [ "Kansas", "KS" ], 
    [ "Kentucky", "KY" ], 
    [ "Louisiana", "LA" ], 
    [ "Maine", "ME" ], 
    [ "Maryland", "MD" ], 
    [ "Massachusetts", "MA" ], 
    [ "Michigan", "MI" ], 
    [ "Minnesota", "MN" ], 
    [ "Mississippi", "MS" ], 
    [ "Missouri", "MO" ], 
    [ "Montana", "MT" ], 
    [ "Nebraska", "NE" ], 
    [ "Nevada", "NV" ], 
    [ "New Hampshire", "NH" ], 
    [ "New Jersey", "NJ" ], 
    [ "New Mexico", "NM" ], 
    [ "New York", "NY" ], 
    [ "North Carolina", "NC" ], 
    [ "North Dakota", "ND" ], 
    [ "Ohio", "OH" ], 
    [ "Oklahoma", "OK" ], 
    [ "Oregon", "OR" ], 
    [ "Pennsylvania", "PA" ], 
    [ "Rhode Island", "RI" ], 
    [ "South Carolina", "SC" ], 
    [ "South Dakota", "SD" ], 
    [ "Tennessee", "TN" ], 
    [ "Texas", "TX" ], 
    [ "Utah", "UT" ], 
    [ "Vermont", "VT" ], 
    [ "Virginia", "VA" ], 
    [ "Washington", "WA" ], 
    [ "West Virginia", "WV" ], 
    [ "Wisconsin", "WI" ], 
    [ "Wyoming", "WY" ]
  ]
  
  def self.all
    # reverse the items within the states array to put the abbrev first
    NAMES.map(&:reverse)
  end
  
  def self.names
     @state_names ||= NAMES.map(&:first).reject(&:nil?)
  end
  
  def self.abbrevs
    @state_abbrevs ||= NAMES.map(&:last).reject(&:nil?)
  end
  
  def self.state_abbrev_hash
    hash = {}
    NAMES.each { |name| hash.store(name[0], name[1]) }
    hash
  end
  
  def self.state_name_hash
    hash = {}
    NAMES.each { |name| hash.store(name[1], name[0]) }
    hash
  end
  
  def self.abbrev_of(name)
    return '' if name.nil?
    return name if name.size == 2
    state_abbrev_hash[name]
  end
  
  def self.name_of(abbrev)
    return '' if abbrev.nil?
    return abbrev if abbrev.size > 2
    state_name_hash[abbrev]
  end
end