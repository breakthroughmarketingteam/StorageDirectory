namespace :assets do 
  
  desc "Rewrites javascripts/cache and stylesheets/cache"
  task :write => :environment do
    include ActionView::Helpers
    assets = { :javascripts => JAVASCRIPT_INCLUDES, :stylesheets => STYLESHEET_INCLUDES }
    
    puts "\nWill write these assets:\n#{assets.pretty_inspect}\n"
    
    assets.each_pair do |asset_name, assets|
      joined_name = "cache/all.#{asset_name == :javascripts ? 'js' : 'css'}"
      joined_path = File.join("public/#{asset_name}", joined_name)
      
      puts "-----> Begin writing #{asset_name} in #{joined_path}"
      
      write_asset_file_contents(joined_path, (asset_name == :javascripts ? compute_javascript_paths(assets, true) : compute_stylesheet_paths(assets, true)))
    end
    
    puts "\nTotally just rewrote the bits outta those assets.\n\n"
  end
  
end