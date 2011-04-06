xml.instruct! :xml, :version => '1.0'
xml.rss :version => '2.0' do
  xml.channel do
    xml.title 'Self Storage Tips'
    xml.description 'Read userful tips about self storage, packing, what to bring, what to do. Do\'s and don\'ts. Have a useful tip yourself? Contribute your knowledge and post a tip!'
    xml.link "http://#{$root_domain}/storage-tips.rss"
    
    @tips.each do |tip|
      xml.item do
        xml.title tip.title
        xml.description tip.content
        xml.pubDate tip.created_at.to_s(:rfc822)
        xml.link "/storage-tips#tip_#{tip.id}"
      end
    end
  end
end