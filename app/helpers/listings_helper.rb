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
  
  def breadcrumb(listing = nil)
    return '' if params[:storage_type].blank?
    separator = ' ❯ '
    b = "<p class='breadcrumb'><span>#{params[:storage_type].titleize}</span>#{separator}<span>#{@search.state}</span>#{separator}<a href='/#{params[:storage_type]}/#{@search.state}/#{@search.city}'>#{@search.city}</a>"
    b << "#{separator}#{link_to listing.title, facility_path(@search.storage_type.parameterize, listing.title, listing.id)}" if listing
    b << '</p>'
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
  
  def results_main_button(listing)
    partial = listing.available_sizes.empty? ? :reserve : :sizes
    
    if listing.accepts_rentals?
      link_to 'Rent It!', listing.get_partial_link(partial), :class => 'tab_link reserve_btn', :rel => partial
    else
      link_to 'Request', listing.get_partial_link(:request_info), :class => 'tab_link request_btn', :rel => 'reserve'
    end
  end
  
  def listing_distance_from
    number_with_precision(@listing.distance_from(@search.lat_lng), 2) rescue nil
  end
  
  def listing_action_btn_class(listing)
    if listing.accepts_rentals?
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
				html += '<p>Every day, 24 hours</p>'
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
				html += '<p>Every day, 24 hours</p>'
			else
				html += '<ul class="greylist">'
					html += render(:partial => listing.office_hours)
				html += '</ul>'
			end
		  html += '</div>'
		end
  end
  
  def locator_header
    unless @listings.blank?
      html = "Found <span class=\"hlght-text\">#{@listings.total_entries}</span> #{@search.storage_type || 'self storage'}#{'s' if @listings.size > 1}"
      
      if @search.is_city?
  			html << " within <span class=\"hlght-text\">#{@search.within}</span> miles"
  			html << " of <span class='hlght-text'>#{@search.city}, #{@search.state}#{" #{@search.zip}" if @search.is_zip? }</span>" unless @search.lat.blank?
  		else
  			html << " matching <span class=\"hlght-text\">#{@search.extrapolate :title}</span>"
  		end
    else
      html = "Looking for #{@search.storage_type} within <span class='hlght-text'>#{@search.within}</span> miles of <span class='hlght-text'>#{@search.city}, #{@search.state}</span> #{ajax_loader}"
    end
	  
		html
  end
  
  @@standard_logo_root = 'public/images'
  @@standard_logo_path = 'ui/storagelocator/facility_logos'
  @@standard_logo_ext = '.png'
  def standard_logos
    @standard_logo ||= get_list_of_file_names "#{@@standard_logo_root}/#{@@standard_logo_path}", @@standard_logo_ext
  end
  
  def standard_logo_path(logo)
    "#{@@standard_logo_path}/#{logo}#{@@standard_logo_ext}"
  end
  
  def copy_all_link(what, listing, options)
    "<span class='copy_all'>[#{link_to options[:text], copy_to_all_listing_path(listing, :what => what), :title => options[:title]}]</span>" unless listing.siblings.empty?
  end
  
  def display_logo(listing, options = {})
    @min_title_len = 21
    
    if listing.logo.exists?
      "<div class='clogo'>#{link_to_if(listing.premium?, image_tag(listing.logo.url(:thumb), options), facility_path((@search ? @search.storage_type.parameterize : 'self-storage'), listing.title.parameterize, listing.id))}</div>"
      
    elsif (logo = standard_logos.detect { |s| listing.title =~ /(#{s.gsub '-', ' '})/i })
      link_to_if listing.premium?, image_tag(standard_logo_path(logo), options), facility_path(get_storage_type, listing.title.parameterize, listing.id), :class => 'standard_logo'
      
    else
      get_listing_logos
      img_hash = @listing_logos[listing.default_logo || 4] || @listing_logos[4]
      img_hash[:alt] = listing.title
      img = image_tag img_hash[:src], img_hash.merge(options)
      span = "<span class='#{'w' if listing.default_logo == 1}#{' short' if listing.title.size <= @min_title_len}'>"
      
      link_to_if listing.premium?, "#{img}#{span}#{selective_abbrev(listing.title).titleize}</span>", facility_path(get_storage_type, listing.title.parameterize, listing.id), :class => 'dlogo_wrap' do |name|
        "#{img}#{span}#{selective_abbrev(listing.title).titleize}</span>"
      end
    end
  end
  
  def get_storage_type
    @search ? @search.storage_type.parameterize : 'self-storage'
  end
  
  def display_default_logo_choices
    get_listing_logos.map { |logo| image_tag logo.delete(:src), logo }.join
  end
  
  def get_listing_logos
    @listing_logos ||= begin
      logos = []
      %w(w r o g b).each_with_index do |color, i|
        logos << { :src => "/images/ui/storagelocator/df-logo-#{color}.png", :class => 'default_logo', :alt => '', 'data-ci' => i }
      end
      logos
    end
  end
  
  def display_compared(listing, compare)
    if compare == :online_rentals
      listing.premium? ? 'Yes' : '•'
      
    elsif Listing.top_types.include? compare.to_s
      size = listing.sizes.first :conditions => ['LOWER(title) = ?', compare.to_s.downcase]
      size ? "$#{size.dollar_price}" : '•'
      
    elsif compare == :specials
      listing.specials.size > 0 ? listing.specials.size : '•'
      
    elsif compare == :features
      display_features listing
    end
  end
  
  def display_features(listing)
    listing.facility_features.map(&:title).reject(&:blank?).join ', '
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
      html << "<form action='/#{@search.storage_type.parameterize}/#{@search.state}/#{@search.city}' method='get' class='more_results_form'>" + 
        link_to("#{ajax_loader}<span><span class='plus'>+</span> Show #{remaining < per_page ? remaining : per_page} more</span>", '#more', :class => 'more_results') + 
        "<input class='hidden' name='search[query]' value='#{@search.query}' />" + 
        "<input class='hidden' name='page' value='#{page + 1}' />" + 
        (params[:zip] ? "<input class='hidden' name='search[zip]' value='#{params[:zip]}' />" : '') +
        (@search.unit_size ? "<input class='hidden' name='search[unit_size]' value='#{@search.unit_size}' />" : '') +
        (@search.storage_type ? "<input class='hidden' name='search[storage_type]' value='#{@search.storage_type}' />" : '') +
        (@search.features ? "<input class='hidden' name='search[features]' value='#{@search.features}' />" : '') +
        "<input class='hidden' name='search[within]' value='#{@search.within}' />" +
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
  
  def listing_sort_class(sort_by)
    classes = 'list_sort'
    if @search.sorted_by == sort_by
      classes << ' active '
      classes << (@search.sort_reverse == '+' ? 'up' : 'down')
    end
    classes
  end
  
  def friendly_sorted_by_label
    if @search.sorted_by.blank?
      html = "Your <span id='sorted_by'>most relevant</span> #{@search.storage_type} is being displayed first"
    else
      case @search.sorted_by when 'name'
        html = "Displaying results in <span id='sorted_by'>alphabetical</span> order #{@search.sort_reverse == '+' ? 'in reverse Z-A' : 'A-Z'}"
      when 'distance'
        html = "The <span id='sorted_by'>#{@search.sort_reverse == '+' ? 'farthest' : 'closest'}</span> facility is being displayed first"
      when 'price'
        html = "The <span id='sorted_by'>#{@search.sort_reverse == '+' ? 'cheapest' : 'most expensive'}</span> facility is being displayed first"
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
