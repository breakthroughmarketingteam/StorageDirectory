module SharedModelMethods #:nodoc:

  def self.included(base)
    base.extend ClassMethods
  end

  module ClassMethods
    
    def access_shared_methods
      include SharedModelMethods::InstanceMethods
      extend SharedModelMethods::SingletonMethods
    end
    
    def to_controller_str
      self.name.underscore.pluralize
    end
    
  end
  
  module SingletonMethods
    
    def helptext
      Helptext.find_by_model(self.name.downcase)
    end

    def helptext=(attributes)
      Helptext.find_by_model(self.name.downcase).update_attributes(attributes)
    end
    
    def find_by_title_in_params(title)
      all.detect { |model| model.name_or_title.parameterize == title.parameterize }
    end
    
    # when a model implements an alias to a field in an associated model, we need to get the assoc table name to use in a sql condition
    # for example @listing responds_to :address, but address is not a field in listings, rather a field in its associated model map.
    def get_assoc_prefix_for(field)
      prefix = join = ''
      
      self.reflect_on_all_associations.each do |reflection|
        assoc_class = reflection.name.to_s.singularize.camelcase.constantize rescue next
        
        if assoc_class.column_names.include?(field)
          join = reflection.name.to_s
          prefix = join.pluralize
          break
        end
      end
      
      { :prefix => prefix, :join => join }
    end
    
    def get_tags
      @tags ||= Tagging.all(:conditions => { :taggable_type => self.name }, :include => :tag).map { |t| t.tag.name }.uniq
    end
    
    def has_association?(assoc)
      self.reflect_on_all_associations.map(&:name).include? assoc
    end
    
    def benchmark(title = "#{controller_name}##{action_name}")
      cur = Time.now
      result = yield
      out = "BENCHMARK (#{title}): #{cur = Time.now - cur} seconds"
      out << " (#{(cur / $last_benchmark * 100).to_i - 100}% change)\n" rescue ""
      mylogger out
      $last_benchmark = cur
      result
    end

    def mylogger(text)
      return
      puts "\n********************************************************************************* MY LOGGER **************************************************************************************\n"
      puts "-----> #{text}\n"
      puts "**********************************************************************************************************************************************************************************\n"
    end
    
  end
  
  # This module contains instance methods
  module InstanceMethods
    
    def columns_with_assoc(*assoc)
      columns = []
      self.class.column_names.each do |column|
        next if column.to_s =~ /id$|_at$/
        columns << { self.class.name => column }
      end
      
      assoc.each do |klass|
        klass.to_s.camelcase.constantize.column_names.each do |column|
          next if column.to_s =~ /id$|_at$/
          columns << { klass.to_s.camelcase => column }
        end
      end
      
      columns
    end
   
    def blocks_for_region(region)
      eval "@#{region}_blocks ||= self.blocks_models.all(:conditions => ['place = ? AND enabled IS TRUE', region.to_s], :order => :position).map(&:block).flatten.reject(&:nil?)"
    end
    
    def enabled_blocks
      return unless self.respond_to?('blocks')
      @enabled_blocks ||= self.blocks.select { |block| block.enabled_in? self }
    end
    
    def get_scope_models
      return [] if self.scope.blank?
      self.scope.camelcase.constantize.all.map { |model| ["(#{model.id}) #{model.name_or_title}", model.id] }
    end

    def name_or_title
      self.respond_to?('name') ? name : title rescue nil
    end

    def timestamp(prefered = 'updated_at')
      timestamp = nil
      if self.respond_to?(prefered)
        timestamp = self.send(prefered)
      elsif self.respond_to?('updated_at')
        timestamp = self.updated_at
      elsif self.respond_to?('created_at')
        timestamp = self.created_at
      end
      timestamp
    end
    
    def nice_date(col = :created_at, options = {})
      if self.respond_to? col
        format = options[:include_time] ? '%r %B %d, %Y' : '%B %d, %Y'
        self.send(col).strftime format
      end
    end

    def content_teaser(limit = 400)
      self.content.stripped_teaser(limit) unless self.content.blank?
    end
    
    def has_extra_options?
      self.respond_to?(:process_erb)
    end
    
    def is_using_extra_options?
      self.has_extra_options? && self.process_erb?
    end
    
    def city_state_zip
      return unless self.respond_to? :city
      "#{city}, #{state} #{zip}"
    end
    
    def full_address
      return unless self.respond_to? :address
      "#{address} #{city_state_zip}"
    end
    
    def update_assoc(assoc, params)
      return if params.blank?
      
      params.each do |param|
        raise [assoc, params, param].pretty_inspect if assoc == :block_form
        next if param[:id].blank? && param[:enabled].blank?                # => didn't select anything
        
        if !param[:id].blank? && !param[:enabled].blank?                   # => found an existing relation, update it
          self.send(assoc).find(param.delete(:id)).update_attributes(param)
        elsif !param[:id].blank? && param[:enabled].blank?                 # => destroy the relation
          self.send(assoc).find(param[:id]).destroy
        else                                                               # => build a new one
          begin
            self.send(assoc).create(param)
          rescue
            self.send(assoc).build(param)
          end
        end
      end
    end
    
    # handles a few different cases where we need to build an option tag list from options_array and specify the selected option
    # models_views and blocks_model require the assoc symbol, models_views object is the actual associated object,
    # blocks_model needs the join model object, attribute is either object's attribute being matched against options_array
    # the nil case is for checking options_array against self's attribute
    def option_tags_for(options_array = [], assoc = nil, object = nil, attribute = nil, prompt = nil, selected = nil)
      option_tags = prompt ? ["<option value=''>#{prompt}</option>"] : []

      case assoc
        when :models_views
          models_view = self.models_views.find_by_view_id(object)

          options_array.each do |option|
            option_tags << _option_tag(attribute, option, (models_view && models_view.view_type == option.to_s))
          end
          
        else # => no assoc object, or the blocks_model_object
          options_array.each do |option|
            option_tags << _option_tag(attribute, option, _should_be_selected?(object, attribute, option, selected))
          end
      end

      option_tags
    end # END option_tags_for()
    
    def get_assoc_instance(key, val)
      assoc_str = key.gsub('_id', '')
      
      if assoc_str == 'commentable'
        self.commentable
      else
        model_class = assoc_str.camelcase.constantize
        model_class.find(val) if model_class.exists?(val)
      end
    rescue
      nil
    end
    
    def has_module?(module_name, gm_module)
      gm_module.new_record? || gm_module.name == module_name
    end
    
    def json_string_to_hash(string)
      eval(string.gsub(/\\/, '').gsub(':', ' => ')) unless string.nil?
    end
    
    def get_tags(rem = 'tip')
      self.respond_to?(:tag_list) ? self.tags.reject { |t| t.name == rem }.map(&:name) : []
    end
    
    def display_tag_list_with_links(rem = 'tip', baseUrl = '/tagged/tips/')
      self.get_tags(rem).map { |t| "<a href='#{baseUrl + t}' class='tag_link'>#{t}</a>" } * ', '
    end
    
    def city_state_zip
      "#{city}, #{state} #{prep_zip}" if self.respond_to? :zip
    end

    def prep_zip
      (zip.to_s.size < 5 ? "0#{zip}" : zip) if self.respond_to? :zip
    end
    
    def ordered_attributes
      if self.class.respond_to? :attribute_order
        ordered = []
        
        self.class.attribute_order.each do |key|
            ordered << [key, self.send(key)]
        end
        ordered
      else
        self.attributes.sort
      end
    end
    
    private
    
    def _should_be_selected?(object, attribute, option, selected) 
      # => role_id : 1-Admin, extract id from start of string if attribute has _id
      opt = attribute.to_s['_id'] ? option.to_s.to_i : option.to_s
      opt == selected.to_s || _self_or_object_attribute(self, object, attribute) == opt
    end
    
    def _option_tag(attribute, value, selected)
      value_title = attribute.to_s['_id'] ? value.gsub(/^(\d*-)/, '') : value.to_s
      
      selected ? 
      "<option selected='selected' value='#{value}'>#{value_title.titleize}</option>" : 
      "<option value='#{value}'>#{value.to_s.titleize}</option>"
    end

    def _self_or_object_attribute(zelf, object, attribute)
      zelf.respond_to?(attribute) ? zelf.send(attribute) : object.send(attribute)
    end
    
    def render_errors
      self.errors.full_messages.map { |e| "<p>#{e}</p>" }
    end
   
  end # END InstanceMethods
  
end
