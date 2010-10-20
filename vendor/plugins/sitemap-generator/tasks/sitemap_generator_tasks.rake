require File.join(File.dirname(__FILE__), '/../lib/sitemap_generator.rb')

namespace :sitemap do

  desc "Generates the sitemap"
  task :generate do
    # Finds models and generates the sitemap
    #SitemapGenerator::Generator.run 
    
    # You can also generate a sitemap 'manually' like this:
    SitemapGenerator::Generator.generate 'config' do |sitemap|
      Listing.all(:order => 'user_id desc', :limit => nil).each do |listing|
        sitemap.add listing, 1, :weekly
      end
      
      UsCity.all_that_have_listings.each do |city|
        sitemap.add city, 0.9, :weekly
      end
      
      Post.all(:order => 'updated_at desc', :limit => nil).each do |post|
        sitemap.add post, 0.8, :weekly
      end

      Page.all(:order => 'updated_at desc', :limit => nil).each do |page|
        sitemap.add page, 0.7, :monthly
      end
    end
  end

end
