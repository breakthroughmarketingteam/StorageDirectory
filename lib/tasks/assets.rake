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
  
  desc "Upload all images to s3 to their respective folders"
  task :images2s3 => :environment do
    images_dirs = %w(ui facility_logos)
    dirs = file_names = []
    
    puts "Scanning #{images_dirs.size} directories"
    
    images_dirs.each do |dir|
      Dir.glob("public/images/#{dir}/**/").each do |d|
        dirs << d
        Dir.glob("#{d}*.*") { |f| file_names << f }
      end
    end
    
    fs = file_names.size
    puts "Begin creating #{fs} Images and uploading to S3"
    
    file_names.each_with_index do |f, i|
      next if f.match(/\/$/)
      puts "-----> Processing: #{f}"
      
      fname = f.split('/').last
      orig_dir = f.split('/').reject { |r| r == fname || r == 'public' }.join('/')
      
      img = ImgAsset.new :title => fname, :original => f, :orig_dir => orig_dir
      File.open(f) { |f| img.cdn = f }
      img.save
      puts "       #{percent_of(i + 1, fs)} Done. uploaded to: (#{img.cdn.url})\n"
    end
    
    puts "DONE ALL\nUploaded #{fs} images from #{dirs.size} directories."
    puts file_names.pretty_inspect
  end
  
  def percent_of(is, of)
    "#{sprintf("%.2f", (is.to_f / of.to_f * 100))}%"
  end
  
end