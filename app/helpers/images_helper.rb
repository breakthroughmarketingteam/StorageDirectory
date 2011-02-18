module ImagesHelper
  
=begin
I'm getting this error when trying to call image_path on an Image
Error:can't convert Image into String
Stack trace:
/usr/local/lib/ruby/gems/1.8/gems/actionpack-2.3.5/lib/action_view/helpers/asset_tag_helper.rb:531:in `extname'
/usr/local/lib/ruby/gems/1.8/gems/actionpack-2.3.5/lib/action_view/helpers/asset_tag_helper.rb:531:in `compute_public_path'
/usr/local/lib/ruby/gems/1.8/gems/actionpack-2.3.5/lib/action_view/helpers/asset_tag_helper.rb:452:in `image_path'
/usr/local/lib/ruby/gems/1.8/gems/actionpack-2.3.5/lib/action_controller/polymorphic_routes.rb:107:in `__send__'
/usr/local/lib/ruby/gems/1.8/gems/actionpack-2.3.5/lib/action_controller/polymorphic_routes.rb:107:in `polymorphic_url'
/usr/local/lib/ruby/gems/1.8/gems/actionpack-2.3.5/lib/action_controller/polymorphic_routes.rb:114:in `polymorphic_path'
/usr/local/lib/ruby/gems/1.8/gems/actionpack-2.3.5/lib/action_view/helpers/url_helper.rb:91:in `url_for'
/usr/local/lib/ruby/gems/1.8/gems/actionpack-2.3.5/lib/action_view/helpers/url_helper.rb:228:in `link_to'
/Users/diego/Sites/usssl/app/views/views/partials/_gallery.html.erb:6:in `_run_erb_app47views47views47partials47_gallery46html46erb_locals_data_gallery_object'
/Users/diego/Sites/usssl/app/views/views/partials/_gallery.html.erb:2:in `each'
/Users/diego/Sites/usssl/app/views/views/partials/_gallery.html.erb:2:in `_run_erb_app47views47views47partials47_gallery46html46erb_locals_data_gallery_object'
/Users/diego/Sites/usssl/app/views/shared/_base_model_index.html.erb:8:in `_run_erb_app47views47shared47_base_model_index46html46erb_locals_base_model_index_data_object'
/Users/diego/Sites/usssl/app/views/shared/_model_index.html.erb:9:in `_run_erb_app47views47shared47_model_index46html46erb_locals_data_model_index_object'
/Users/diego/Sites/usssl/app/views/images/index.html.erb:1:in `_run_erb_app47views47images47index46html46erb'
=end
  def display_image_link(title, model)
  	if model.is_a? Image
  		"<h5 class=\"title\">#{link_to title, "/images/#{model.id}"}</h5>"
  	else
  		"<h5 class=\"title\">#{link_to title, model}</h5>"
  	end	
  end
  
  # display all urls
  def display_image_urls
    if @image.image_file_size.blank?
      @image.pp_image_url
    else
      [:thumb, :medium, :large].map do |size|
        "<p><span class='block left w80'>#{size.to_s.titleize}:</span> #{text_field_tag "image_#{size}", @image.pp_image_url(size), :class => 'select_on_focus stack'}</p>"
      end
    end
  end
  
end
