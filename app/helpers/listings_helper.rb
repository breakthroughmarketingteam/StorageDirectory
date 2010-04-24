module ListingsHelper
  
  def greyresult_panel_template(listing, &content)
    html  = "\n<h5 class=\"white dark_text_shadow\">#{listing.title}</h5>\n<div class=\"inner border_box\">"
      html << yield
    html << "</div>\n"
  end
  
  def google_directions_link(address)
    "http://maps.google.com/maps?f=d&amp;hl=en&amp;daddr=#{address}"
  end
  
  def listing_distance(listing)
    if listing.respond_to? :distance
      '<span class="block bold font110">' + number_with_precision(listing.distance, :precision => 2) + '</span>Miles'
    end
  end
  
end
