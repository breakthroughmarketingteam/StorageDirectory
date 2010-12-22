class EmailBlast < ActiveRecord::Base
  
  validates_presence_of :title, :content
  access_shared_methods
  
  def self.find_by_title_in_params(title)
    all.detect { |blast| blast.title.parameterize == title }
  end
  
end
