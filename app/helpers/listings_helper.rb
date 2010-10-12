module ListingsHelper
  
  def is_facility_owner?
    action_name == 'edit' || (current_user && current_user.has_role?('advertiser'))
  end
  
  def is_owner_editing?
    is_facility_owner? && action_name == 'edit'
  end
  
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
      number_with_precision(listing.distance, :precision => 1)
    end
  end
  
  def display_location(location)
    "in #{location.city}, #{location.state}" if location.respond_to? :city
  end
  
  def num_entries(data)
    data.respond_to?(:total_entries) ? data.total_entries : 0
  end
  
  def result_index(listing)
    (params[:page] || 1) * (@listings.index(listing) + 1)
  end
  
  def results_main_button(listing)
    partial = listing.available_sizes.empty? ? :reserve : :sizes
    if listing.accepts_reservations?
      link_to 'Reserve', listing.get_partial_link(partial), :class => 'tab_link reserve_btn', :rel => partial
    else
      link_to 'Request', listing.get_partial_link(:request_info), :class => 'tab_link', :rel => 'reserve'
    end
  end
  
  def listing_distance_from
    number_with_precision(@listing.distance_from([session[:location][:lat], session[:location][:lng]]), 2) rescue nil
  end
  
  def more_results_link(data)
    per_page = data.per_page
    page = params[:page] ? params[:page].to_i : 1
    
    range_start = (per_page * page) - (per_page - 1)
    range_end = (per_page * page) > data.total_entries ? data.total_entries : per_page * page
    remaining = data.total_entries - (range_start + per_page - 1)
    
    html = "<span>Showing <span class='results_range'>#{range_start}-#{range_end}</span> of <span class='results_total'>#{data.total_entries}</span> results. </span>"
    
    # only show the More link if there are more
    if range_start < data.total_entries - per_page+1
      html << link_to("#{ajax_loader}<span><span class='plus'>+</span> Show #{remaining < per_page ? remaining : per_page} more</span>", '#more', :class => 'more_results')
      html << "<span class='hidden' name='params_pagetitle'>#{@page.title.parameterize}</span>"
      html << "<span class='hidden' name='params_query'>#{params[:q] || params[:city]}</span>"
      html << "<span class='hidden' name='params_page'>#{((params[:page] ? params[:page].to_i : 1) + 1)}</span>"
      html << "<span class='hidden' name='params_within'>#{params[:within]}</span>"
    end
    
    html 
  end
  
  def edit_listing_title(listing)
    if listing.nil? || listing.new_record?
      text_field_tag 'listing[title]', nil, :class => 'required hintable small_text_field i', :title => 'Facility Name'
    else
      content_tag :h3, listing.title
    end
  end
  
  def edit_listing_address(listing)
    if listing.nil? || listing.new_record?
      text_field_tag 'listing[map_attributes][address]', nil, :class => 'required hintable small_text_field i', :title => 'Street Address'
    else
      listing.map && !listing.map.address.blank? ? "#{listing.map.address}<br />" : ''
    end
  end
  
  def edit_listing_city_state_zip(listing)
    if listing.nil? || listing.new_record?
      (html ||= '') << text_field_tag('listing[map_attributes][city]', nil, :class => 'required hintable small_text_field i', :title => 'City')
      html << text_field_tag('listing[map_attributes][state]', nil, :class => 'required autocomplete hintable tiny_text_field i', :title => 'State', :rel => 'States_abbrevs', :maxlength => 2)
      html << text_field_tag('listing[map_attributes][zip]', nil, :class => 'numeric_zip hintable tiny_text_field i', :title => 'Zip')
      html
    else
      listing.map.city_state_zip
    end
  end
  
  def render_tab_nav
    @sizes_link    = link_to('Unit Sizes', '#', :rel => 'sl-tabs-sizes') unless @sizes.blank?
    @map_link      = link_to('Map', '#', :rel => 'sl-tabs-map') unless @map.blank? || @map.lat.nil?
    @features_link = link_to('Features', '#', :rel => 'sl-tabs-feat') unless @features.blank?
    @pictures_link = link_to('Pictures', '#', :rel => 'sl-tabs-pict' ) unless @pictures.blank?
    html = ''; activated = false
    
    ['sizes', 'map', 'features', 'pictures'].each do |tab|
      @model = eval "@#{tab}"
      
      unless @model.nil?
        unless activated
          html << content_tag(:li, eval("@#{tab}_link"), :class => 'active')
          activated = true
        else
          html << content_tag(:li, eval("@#{tab}_link"))
        end
      end
    end
    
    html
  end
  
  def if_tabs_empty_text
    '' if @sizes.blank? && (@map.blank? || @map.lat.nil?) && @features.blank? && @pictures.blank?
  end
  
  def claim_listing_link(listing)
    link_to 'Hey! This is my facility!', "/add-your-facility?client[company]=#{listing.title}&listing[city]=#{listing.city}&listing[state]=#{listing.state}" if listing.client.nil?
  end
  
end
