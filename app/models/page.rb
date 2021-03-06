class Page < ActiveRecord::Base
  
  #acts_as_nested_set
  has_many :blocks_model, :as => :model, :dependent => :destroy
  accepts_nested_attributes_for :blocks_model
  
  has_many :views, :as => :model
  accepts_nested_attributes_for :views
  
  has_one :module, :class_name => 'ModelsModule', :as => :model
  accepts_nested_attributes_for :module, :allow_destroy => true
  
  validates_uniqueness_of :title
  validates_presence_of :title
  
  acts_as_commentable
  acts_as_taggable_on :categories, :keywords
  access_shared_methods
  sitemap :change_frequency => :monthly, :priority => 0.7, :order => 'updated_at DESC'
  
  @@searchables    = %w(title description)
  cattr_reader :searchables
  
  # Class Methods
  
  def self.all_for_index_view
    all :select => 'title, description, content, id, parent_id'
  end
  
  def self.nav_pages
    pages = all(:conditions => 'show_in_nav IS TRUE', :order => 'position, id')
  end
  
  # Instance Methods
  
end