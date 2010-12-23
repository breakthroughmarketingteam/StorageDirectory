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
    
    @@addedd_city_paths = []
    
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

      @xml.url do
        # monkey patch by d.s. for usssl
        if model_instance.is_a? UsCity
          path = "http://#{Options.domain}#{us_city_url(model_instance)}"
          
          unless @@addedd_city_paths.include? path
            @@addedd_city_paths << path
            @xml.loc path
            puts "added sitemap record: UsCity [#{path}]"
          end
        
        elsif model_instance.is_a? Listing
          path = "http://#{Options.domain}#{facility_path(model_instance.storage_types.split(',')[0].try(:parameterize), model_instance.title.parameterize, model_instance.id)}"
          @xml.loc path
          puts "added sitemap record: Listing [#{path}]"
          
        elsif model_instance.is_a? Page
          path = "http://#{Options.domain}#{page_title(model_instance)}"
          @xml.loc path
          puts "added sitemap record: Page [#{path}]"
        
        elsif model_instance.is_a? Post
          path = "http://#{Options.domain}#{post_title(model_instance)}"
          @xml.loc path
          puts "added sitemap record: Post [#{path}]"
        
        else
          path = "http://#{Options.domain}#{Helpers.instance.url_for(model_instance)}"
          @xml.loc path
          puts "added sitemap record: #{model_instance.class.name} [#{path}]"
        end
        @xml.lastmod Helpers.instance.w3c_date(last_modified) if last_modified
        @xml.changefreq change_freq.to_s if change_freq
        @xml.priority priority if priority
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
    def us_city_url(city)
      self_storage_path :state => city.state.parameterize.to_s, :city => city.name.parameterize.to_s
    end
    
    def page_title(page)
      "/#{page.title.parameterize}"
    end
    
    def post_title(post)
      "/posts/#{post.title.parameterize}"
    end
    
  end
end
