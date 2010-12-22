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
          @xml.loc "http://#{Options.domain}#{us_city_url(model_instance)}"
          puts "added sitemap record: UsCity [#{@xml.loc}]"
        elsif model_instance.is_a? Listing
          begin
            @xml.loc "http://#{Options.domain}#{facility_path(model_instance.storage_types.split(',')[0].try(:parameterize), model_instance.title.parameterize, model_instance.id)}"
          rescue => e
            raise [e.message, model_instance].pretty_inspect
          end
          puts "added sitemap record: Listing [#{@xml.loc}]"
        elsif model_instance.is_a? Page
          @xml.loc "http://#{Options.domain}#{page_title(model_instance)}"
          puts "added sitemap record: Page [#{@xml.loc}]"
        elsif model_instance.is_a? Post
          @xml.loc "http://#{Options.domain}#{post_title(model_instance)}"
          puts "added sitemap record: Post [#{@xml.loc}]"
        else
          @xml.loc "http://#{Options.domain}#{Helpers.instance.url_for(model_instance)}"
          puts "added sitemap record: #{model_instance.class.name} [#{@xml.loc}]"
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
