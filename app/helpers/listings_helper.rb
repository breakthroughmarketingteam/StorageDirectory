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
    @listings.index(listing) + 1
  end
  
  def display_default_logo_choices
    @listing_logos.map { |logo| image_tag logo.delete(:src), logo }.join
  end
  
  def results_main_button(listing)
    partial = listing.available_sizes.empty? ? :reserve : :sizes
    if listing.accepts_reservations?
      link_to 'Reserve', listing.get_partial_link(partial), :class => 'tab_link reserve_btn', :rel => partial
    else
      link_to 'Request', listing.get_partial_link(:request_info), :class => 'tab_link request_btn', :rel => 'reserve'
    end
  end
  
  def listing_distance_from
    number_with_precision(@listing.distance_from(@prev_search.lat_lng), 2) rescue nil
  end
  
  def listing_action_btn_class(listing)
    if listing.accepts_reservations?
      ' reserve'
    elsif listing.premium?
      ' hold_unit'
    else
      ' request'
    end
  end
  
  def display_listing_hours(listing)
    html = ''
    unless listing.access_24_hours.nil? && listing.access_hours.empty?
		  html += '<div class="access_hours">'
		  html += '<p class="info_heading">Access Hours</p>'
			if listing.access_24_hours
				html += '<p class="grey">Every day, 24 hours</p>'
			else
				html += '<ul class="greylist">'
					html += render(:partial => listing.access_hours)
				html += '</ul>'
			end
		  html += '</div>'
		end
		unless listing.office_24_hours.nil? && listing.office_hours.empty?
		  html += '<div class="office_hours">'
		  html += '<p class="info_heading">Office Hours</p>'
			if listing.office_24_hours
				html += '<p class="grey">Every day, 24 hours</p>'
			else
				html += '<ul class="greylist">'
					html += render(:partial => listing.office_hours)
				html += '</ul>'
			end
		  html += '</div>'
		end
  end
  
  def display_logo(listing, options = {})
    @min_title_len = 21
    
    if listing.logo.exists?
      link_to image_tag(listing.logo.url(:thumb), options), facility_path(listing.title.parameterize, listing.id)
    else
      img_hash = @listing_logos[listing.default_logo || 0]
      img_hash[:alt] = listing.title
      link_to "#{image_tag(img_hash[:src], img_hash.merge(options))}<span class='#{'w' if listing.default_logo == 1}#{' short' if listing.title.size <= @min_title_len}'>#{selective_abbrev(listing.title).titleize}</span>", facility_path(listing.title.parameterize, listing.id), :class => 'dlogo_wrap'
    end
  end
  
  def more_results_link(data)
    per_page = @listings_per_page
    page = params[:page] ? params[:page].to_i : 1
    
    range_start = (per_page * page) - (per_page - 1)
    range_end = (per_page * page) > data.total_entries ? data.total_entries : per_page * page
    remaining = data.total_entries - (range_start + per_page - 1)
    html = ''
    
    # only show the More link if there are more
    if range_start < data.total_entries - per_page + 1
      html << "<form action='/#{@page.title.parameterize}' method='get' class='more_results_form'>" + 
        link_to("#{ajax_loader}<span><span class='plus'>+</span> Show #{remaining < per_page ? remaining : per_page} more</span>", '#more', :class => 'more_results') + 
        "<input class='hidden' name='search[query]' value='#{@prev_search.query}' />" + 
        "<input class='hidden' name='page' value='#{page + 1}' />" + 
        (params[:zip] ? "<input class='hidden' name='search[zip]' value='#{params[:zip]}' />" : '') +
        (@prev_search.unit_size ? "<input class='hidden' name='search[unit_size]' value='#{@prev_search.unit_size}' />" : '') +
        (@prev_search.storage_type ? "<input class='hidden' name='search[storage_type]' value='#{@prev_search.storage_type}' />" : '') +
        (@prev_search.features ? "<input class='hidden' name='search[features]' value='#{@prev_search.features}' />" : '') +
        "<input class='hidden' name='search[within]' value='#{@prev_search.within || $_listing_search_distance}' />" +
      '</form>'
    end
    
    html << "<span class='results_showing'>Showing <span class='results_range'>#{range_start}-#{range_end}</span> of <span class='results_total'>#{data.total_entries}</span> results. </span>"
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
    if listing.client.nil? || listing.client.status == 'unverified'
      link_to 'Hey! This is my facility!', "/add-your-facility?client[company]=#{listing.title}&listing[city]=#{listing.city}&listing[state]=#{listing.state}&listing_id=#{listing.id}"
    end
  end
  
end
