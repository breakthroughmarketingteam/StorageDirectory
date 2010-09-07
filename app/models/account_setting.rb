class AccountSetting < ActiveRecord::Base
  
  belongs_to :client
  attr_accessor :parsed_settings
  
  def after_find
    @parsed_settings = eval "#{self.settings_hash}"
    @parsed_settings.each do |k, v|
      define_method
    end
  end
  
end
