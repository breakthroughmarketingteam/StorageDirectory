class User < ActiveRecord::Base
  
  require 'digest'
  
  belongs_to :role
  has_many :permissions, :finder_sql => 'SELECT * FROM permissions p, users u ' +
                                        'WHERE u.id = #{id} AND p.role_id = u.role_id ' +
                                        'ORDER BY p.resource'
  
  has_many :posts
  has_many :images
  has_one  :profile_image, :class_name => 'Image'
  has_many :user_hint_placements, :dependent => :destroy
  has_many :user_hints, :through => :user_hint_placements
  has_many :mailing_addresses
  accepts_nested_attributes_for :mailing_addresses
  
  validates_presence_of :first_name, :email, :role_id
  validates_uniqueness_of :email, :scope => :type
  
  acts_as_authentic
  ajaxful_rater
  acts_as_commentable
  acts_as_tagger
  access_shared_methods
  
  # Class Methods
  
  def self.all_for_index_view
    all
  end
  
  def self.rand_password
    words = File.read("#{RAILS_ROOT}/lib/words").split.select{ |w| w.size < 9 }
    max = words.size
    "#{words[rand(max)]}_#{words[rand(max)]}" 
  end
  
  def self.add_hint_to_all(hint)
    find_each { |u| u.user_hints << hint; u.save }
  end
  
  # Instance Methods
  
  def initialize(params = {})
    super params
    self.temp_password         = self.class.rand_password
    self.password              = self.temp_password
    self.password_confirmation = self.temp_password
    self.activation_code       = self.make_activation_code
    self.status                = 'unverified'
  end
  
  def name
    "#{self.first_name} #{self.last_name}"
  end
  
  def mailing_address
    self.mailing_addresses.first
  end
  
  def has_address?(address_attribtues)
    self.mailing_addresses.any? do |address|
      address[:zip] == address_attribtues[:zip].to_i && address[:address].downcase == address_attribtues[:address].downcase
    end
  end
  
  def make_activation_code
    Digest::SHA1.hexdigest(self.to_s)
  end
  
  def update_attributes(params)
    self.images.build(params[:profile_image]) unless params[:profile_image].blank? || params[:profile_image][:image].blank?
    super(params[:user])
  end
  
  def has_role?(*roles)
    roles.map(&:downcase).include? self.role.title.downcase
  end

  # only allow a user to view and update their own profile
  # or perform allowed action on resources defined in their permissions
  def has_permission?(controller, action, params = {}, model = nil)
    return true if self.has_role?('Admin') || controller == 'user_sessions'
    
    if controller =~ /(users)|(images)/ && action !~ /new|create|destroy/
      if (controller == 'users' && params[:id].to_i == self.id) || (controller == 'images' && params[:user_id].to_i == self.id)
        return true
      end
    end
    
    self.permissions.any? { |p| p.allows?(action, controller) && p.on?(self, model) }
  end
  
  def role_symbols
    [self.role.title.downcase.to_sym]
  end

  def deliver_password_reset_instructions!
    reset_perishable_token!
    Notifier.deliver_password_reset_instructions(self)
  end
  
end
