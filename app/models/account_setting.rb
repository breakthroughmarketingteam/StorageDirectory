class AccountSetting < ActiveRecord::Base
  
  belongs_to :client
  
  def after_find
    raise virtuabutes.pretty_inspect
  end
  
end

String.class_eval do
  def to_hash
    raise "Not able to convert this string to hash: No query delimiters (=, &)" unless self.match(/\&/) && self.match(/\=/)
    
    @hash = {}
    @key_vals = self.split '&'
    
    @key_vals.each do |key_val|
      key, val = key_val.split '='
      @hash.store key.to_sym, CGI.unescape(val)
    end
    
    @hash
  end
end