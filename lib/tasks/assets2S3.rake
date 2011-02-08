namespace :s3up  do
  desc "Upload all images to s3 to their respective folders"
  task :images => :environment do
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
