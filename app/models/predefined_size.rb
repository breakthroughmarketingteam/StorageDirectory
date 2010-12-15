class PredefinedSize < ActiveRecord::Base
  
  access_shared_methods
  
  def title
    "#{read_attribute :title} <span class='predef_dims'>#{dims}</span>"
  end
  
  def dims
    "#{width}x#{length}"
  end
  
end
