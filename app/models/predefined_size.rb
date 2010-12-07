class PredefinedSize < ActiveRecord::Base
  
  has_many :predef_size_assigns, :dependent => :destroy
  has_many :listings, :through => :predef_size_assigns
  
  access_shared_methods
  
end
