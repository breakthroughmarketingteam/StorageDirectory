module PostsHelper
  
  def conditional_tagged_with_path(resource_name, tag_name, post)
    if post.is_a? BlogPost
      "/self-storage-blog/#{tag_name.parameterize}"
    else
      tagged_with_path(resource_name, tag_name)
    end
  end
  
end
