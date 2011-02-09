namespace :tmp do
  namespace :assets do 
    desc "Rewrites javascripts/cache and stylesheets/cache"
    task :write => :environment do
      include ActionView::Helpers
      assets = {
        :javascripts => ['swfobject_modified', 'ckeditor/ckeditor', 'jquery.all', "plugins/inflector", "plugins/jquery.iframe", "plugins/jquery.jqDock.min", "plugins/jquery.inline-search", "plugins/jquery.tools.min", "plugins/jquery.jmap.min", "plugins/jquery.preloadCssImages", "plugins/binfo", 'greymatter', "plugins/greyresults", 'application'],
        :stylesheets => ['plugins/jquery.ui', 'common', 'ajaxful_rating', 'themes/storagelocator/style']
      }
      
      puts "\nWill write these assets:\n#{assets.pretty_inspect}\n"
      
      assets.each_pair do |asset_name, assets|
        joined_name = "cache/all.#{asset_name == :javascripts ? 'js' : 'css'}"
        joined_path = File.join("public/#{asset_name}", joined_name)
        
        puts "-----> Begin writing #{asset_name} in #{joined_path}"
        
        write_asset_file_contents(joined_path, (asset_name == :javascripts ? compute_javascript_paths(assets, true) : compute_stylesheet_paths(assets, true)))
      end
      
      puts "\nTotally just rewrote the bits outta those assets.\n\n"
    end
    
    desc "Clears javascripts/cache and stylesheets/cache"
    task :clear => :environment do      
      FileUtils.rm(Dir['public/javascripts/cache/[^.]*'])
      FileUtils.rm(Dir['public/stylesheets/cache/[^.]*'])
      puts 'Booyah! Cache be gonso!'
    end
  end
end