class Permission < ActiveRecord::Base
  
  belongs_to :role
  
  access_shared_methods
  
  # Class Methods
  
  def self.create_or_update_many(params)
    results = { :permissions => [], :updated => 0, :created => 0 }
    
    params.each do |permission|
      next if permission[:role_id].blank?
      
      if permission[:id].blank?
        results[:permissions] << create(permission)
        results[:created] += 1
      else
        results[:permissions] << find(permission.delete(:id)).update_attributes(permission)
        results[:updated] += 1
      end
    end
    
    results
  end
  
  # Instance Methods
  
  def title
    "#{self.role.title} may #{self.action} #{self.resource}#{' on owned' if self.scoped?}" unless self.new_record?
  end
  
  # map REST action to CRUD action
  def allows?(action, controller)
    return true if self.action == 'all'
    
    controller == self.resource && case action.to_sym when :new, :create
      self.action == 'create'
    when :index, :show
      self.action == 'read'
    when :edit, :update
      self.action == 'update'
    when :destroy
      self.action == 'delete'
    else # fallback: if @param action is already a CRUD action
      self.action == action
    end
  end
  
  def on?(user, model)
    return true unless self.scoped? && !model.nil?
    model_class = model.class.name.underscore.pluralize
    user.respond_to?(model_class) && user.send(model_class).include?(model)
  end
  
end
