class PadZipInSerach < ActiveRecord::Migration
  def self.up
    puts 'Caching searches'
    searches = Search.all
    count = searches.size
    puts "Cached #{count} searches"
    
    searches.each_with_index do |search, i|
      if search.zip && search.zip.size < 5
        search.update_attribute :zip, prep_zip(search.zip)
        puts "-----> (#{sprintf("%.2f", (i.to_f / count.to_f * 100))}%) Padded zip for search #{search.id}"
      end
    end
    
    puts 'Done.'
  end

  def self.down
  end
  
  def self.prep_zip(zip)
    zs = zip.to_s
    if zs.size < 5
      nz = ''
      d = 5 - zip.to_s.size
      d.times { nz << '0' }
      zs = nz + zs
    end
    zs
  end
end
