class Post < ActiveRecord::Base
  
  belongs_to :user
  
  has_many :blocks_model, :as => :model, :dependent => :destroy
  accepts_nested_attributes_for :blocks_model
  
  has_one :module, :class_name => 'ModelsModule', :as => :model
  accepts_nested_attributes_for :module, :allow_destroy => true
  
  validates_uniqueness_of :title
  validates_presence_of :title, :content
  
  named_scope :published, :conditions =>  { :published => true }, :order => 'created_at DESC'
  
  acts_as_commentable
  acts_as_taggable_on :tags, :categories
  access_shared_methods
  ajaxful_rateable :dimensions => [:usefulness]
  sitemap :change_frequency => :weekly, :priority => 0.8, :order => 'updated_at DESC' 
  
  @@searchables    = %w(title content)
  cattr_reader :searchables
  
  # Class Methods
  def self.all_for_index_view
    all :select => 'title, content, published, id, user_id, updated_at'
  end
  
  def self.published_tips
    self.tagged_with(:tip).select(&:published).sort_by(&:updated_at)
  end
  
  def self.published_and_tagged_with(tag)
    self.published.select do |post|
      post.tag_list.map(&:parameterize).include? tag
    end
  end
  
  def self.published_years
    self.published.map { |p| p.created_at.year }.uniq
  end
  
  def self.published_months_for_year(year)
    self.published.select { |p| p.created_at.year == year }.map { |p| p.created_at.strftime '%B' }.uniq
  end
  
  def self.published_on(year, month)
    self.published.select { |p| p.created_at.year == year.to_i && p.created_at.strftime('%B') == month }
  end
  
  def self.count_published_on(year, month)
    self.published_on(year, month).size
  end
  
  # Instance Methods
  
  def to_param
    "#{id}-#{self.title.parameterize}"
  end
  
end
