xml.instruct! :xml, :version => '1.0'
xml.rss :version => '2.0' do
  xml.channel do
    xml.title 'Self Storage Blog'
    xml.description ''
    xml.link formatted_blog_posts_url(:rss)
    
    @blog_posts.each do |blog_post|
      xml.item do
        xml.title blog_post.title
        xml.description blog_post.content
        xml.pubDate blog_post.updated_at.to_s(:rfc822)
        xml.link blog_post_url(blog_post)
      end
    end
  end
end