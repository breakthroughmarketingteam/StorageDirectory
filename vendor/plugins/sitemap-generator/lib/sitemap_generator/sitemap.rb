module SitemapGenerator
  class Sitemap
    
    VALID_CHANGE_FREQ = [
      :always,
      :hourly,
      :daily,
      :weekly,
      :monthly,
      :yearly,
      :never
    ]
    
    @@added_city_paths = []
    @@skip = false;
    
    attr_accessor :xml
    
    def initialize(xml)
      @xml = xml
      raise "Sitemap !!!!domain is nil. You need specify a value for it in #{Options::CONFIG_FILE}" if Options.domain.nil?
    end

    def add(model_instance, priority = nil, change_freq = nil)
      last_modified = find_last_modified(model_instance)

      if !VALID_CHANGE_FREQ.include?(change_freq.to_sym) && !change_freq.nil?
        raise "Invalid change frequency #{change_freq}, should be one of #{VALID_CHANGE_FREQ}" 
      end
      
      @path = ''
      add_city_to_skipped model_instance if model_instance.class.name == 'UsCity'
      
      @xml.url do
        # monkey patch by d.s. for usssl
        case model_instance.class.name when 'UsCity'
          @xml.loc @path
          puts "added sitemap record: UsCity [#{@path}]"
        
        when 'Listing'
          @path = "http://#{Options.domain}#{facility_path_for(model_instance)}"
          @xml.loc @path
          puts "added sitemap record: Listing [#{@path}]"
          
        when 'Page'
          @path = "http://#{Options.domain}#{page_title(model_instance)}"
          @xml.loc @path
          puts "added sitemap record: Page [#{@path}]"
        
        when 'Post'
          @path = "http://#{Options.domain}#{post_title(model_instance)}"
          @xml.loc @path
          puts "added sitemap record: Post [#{@path}]"
        
        else
          @path = "http://#{Options.domain}#{Helpers.instance.url_for(model_instance)}"
          @xml.loc @path
          puts "added sitemap record: #{model_instance.class.name} [#{@path}]"
        end
        
        @xml.lastmod Helpers.instance.w3c_date(last_modified) if last_modified
        @xml.changefreq change_freq.to_s if change_freq
        @xml.priority priority if priority
        
      end unless @@skip || (model_instance.class.name == 'Listing' && !model_instance.premium?)
    end
    
    def add_city_to_skipped(model)
      @path = "http://#{Options.domain}#{get_us_city_url(model)}"

      puts [@path, @@added_city_paths.include?(@path), !Listing.top_cities.include?(model.name.downcase)].pretty_inspect
      
      unless @@added_city_paths.include?(@path) || !Listing.top_cities.include?(model.name.downcase)
        @@added_city_paths << @path
        @@skip = true
      else
        @@skip = false
      end
    end
    
    def find_last_modified(model_instance)
      last_modified = model_instance.read_attribute(:updated_on) || model_instance.read_attribute(:updated_at)
      
      if last_modified.nil?
        last_modified = model_instance.read_attribute(:created_on) || model_instance.read_attribute(:created_at)
      end

      last_modified
    end
    
    # monkey patches by d.s. for usssl
    def get_us_city_url(city)
      self_storage_path :state => States.name_of(city.state).parameterize, :city => city.name.parameterize
    end
    
    def facility_path_for(listing, options = {})
      facility_path listing.storage_type.parameterize.to_s, listing.state.parameterize.to_s, listing.city.parameterize.to_s, listing.title.parameterize.to_s, listing.id, options
    end
    
    def page_title(page)
      "/#{page.title.parameterize}"
    end
    
    def post_title(post)
      "/posts/#{post.title.parameterize}"
    end
    
  end
end
