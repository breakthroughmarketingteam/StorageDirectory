class EmailBlast < ActiveRecord::Base
  
  validates_presence_of :title, :content
  access_shared_methods
  
  def self.all_for_index_view
    all :select => 'id, title, description, content, status, blast_date'
  end
  
  def self.find_by_title_in_params(title)
    all.detect { |blast| blast.title.parameterize == title }
  end
  
end
