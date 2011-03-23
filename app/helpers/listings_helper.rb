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
    separator = ' > '
    
    if listing
      b = "<p class='breadcrumb'><span>#{params[:storage_type].titleize}</span>#{separator}<span>#{listing.state.titleize}</span>#{separator}<a href='/#{params[:storage_type]}/#{listing.state}/#{listing.city}'>#{listing.city}</a>"
    else
      b = "<p class='breadcrumb'><span>#{params[:storage_type].titleize}</span>#{separator}<span>#{@search.state}</span>#{separator}<a href='/#{params[:storage_type]}/#{@search.state}/#{@search.city}'>#{@search.city}</a>"
    end
    
    b << "#{separator}#{link_to listing.title, facility_path_for(listing)}" if listing
    b << '</p>'
  end
  
  def compare_link(listing, context = 'results')
		html = '<div class="compare" title="Select 2 or more to compare">'
			html << link_to('Click here to compare', compare_listings_path, :class => 'hide')
			html << label_tag("compare_#{listing.id}_#{context}", 'Compare')
			html << "<input type='checkbox' value='#{listing.id}' name='compare' id='compare_#{listing.id}_#{context}' />"
		html << '</div>'
  end
  
  def listing_distance(listing)
    number_with_precision(listing.distance, :precision => 1) if listing.respond_to? :distance
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
    
    if listing.renting_enabled? && !listing.available_sizes.empty?
      link_to 'Rent It!', rack_rental_url(listing), :class => 'tab_link reserve_btn', :rel => partial
    else
      link_to 'Request', listing.get_partial_link(:request_info), :class => 'tab_link request_btn', :rel => 'request'
    end
  end
  
  def listing_distance_from
    number_with_precision(@listing.distance_from(@search.lat_lng), 2) rescue nil
  end
  
  def listing_action_btn_class(listing)
    if listing.renting_enabled?
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
      html = "Found <span class=\"hlght-text\">#{@listings.total_entries}</span> #{@search.storage_type || 'self storage'}#{'s' if @listings.size > 1 && !@search.for_auxilary_listing?}"
      
      if @search.is_city? || @search.for_auxilary_listing?
  			html << " within <span class=\"hlght-text\">#{@search.within}</span> miles"
  			html << " of <span class='hlght-text'>#{@search.city}, #{@search.state}#{" #{@search.zip}" if @search.is_zip? }</span>" unless @search.lat.blank?
  			
  		elsif !(title = @search.extrapolate(:title)).blank?
  			html << " matching <span class=\"hlght-text\">#{title}</span>"
  		end
    else
      html = "Looking for #{@search.storage_type} within <span class='hlght-text'>#{@search.within}</span> miles of <span class='hlght-text'>#{@search.city}, #{@search.state}</span> #{ajax_loader}"
    end
	  
		html
  end
  
  @@standard_logo_root = 'public/images/'
  @@standard_logo_path = 'ui/storagelocator/facility_logos/'
  @@standard_logo_ext = '.png'
  def standard_logos
    @standard_logo ||= get_list_of_file_names "#{@@standard_logo_root}#{@@standard_logo_path}", @@standard_logo_ext
  end
  
  def standard_logo_path(logo)
    "#{@@standard_logo_path}#{logo}#{@@standard_logo_ext}"
  end
  
  def copy_all_link(what, listing, options)
    "<span class='copy_all'>[#{link_to options[:text], copy_to_all_listing_path(listing, :what => what), :title => options[:title]}]</span>" unless listing.siblings.empty?
  end
  
  def display_logo(listing, options = {})
    request ||= options.delete(:request) # calling @template.map_data_for in the controller, apparently request is not available to the map_data_for method when used like this
    @min_title_len ||= 21
    
    if listing.logo.exists?
      "<div class='clogo'>#{link_to_if(listing.premium?, image_tag(listing.logo.url(:thumb).sub('http://', request.protocol), options), facility_path_for(listing))}</div>"
      
    elsif (logo = standard_logos.detect { |s| listing.title =~ /(#{s.gsub '-', ' '})/i })
      link_to_if listing.premium?, image_tag(standard_logo_path(logo), options), facility_path_for(listing), :class => 'standard_logo' do
        "<div class='clogo'>#{image_tag(standard_logo_path(logo), options)}</div>"
      end
      
    else
      get_listing_logos(request)
      img_hash = @listing_logos[listing.default_logo || 4] || @listing_logos[4]
      img_hash[:alt] = listing.title
      img = image_tag img_hash[:src], img_hash.merge(options)
      span = "<span class='#{'w' if listing.default_logo == 1}#{' short' if !listing.new_record? && listing.title.size <= @min_title_len}'>"
      
      begin
        link_to_if listing.premium?, "#{img}#{span}#{selective_abbrev(listing.title).try(:titleize)}</span>", facility_path_for(listing), :class => 'dlogo_wrap' do |name|
          "<div class='dlogo_wrap'>#{img}#{span}#{selective_abbrev(listing.title).try(:titleize)}</span></div>"
        end
      rescue ActionController::RoutingError # for some reason even if listing.premium? returns false the facility_path still gets called
        "<div class='dlogo_wrap'>#{img}#{span}#{selective_abbrev(listing.title).try(:titleize)}</span></div>"
      end
    end
  end
  
  def map_data_for(listing, logo_options = {})
    hash = {}
    %w(id title address city state zip lat lng).each do |attribute|
      hash.store attribute.to_sym, CGI.escape(listing.send(attribute).to_s)
    end
    hash.merge :thumb => display_logo(listing, logo_options)
  end
  
  def get_storage_type
    @search ? @search.storage_type.parameterize : 'self-storage'
  end
  
  def display_default_logo_choices
    get_listing_logos.map { |logo| image_tag logo.delete(:src), logo }.join
  end
  
  def get_listing_logos(request = nil)
    @listing_logos ||= begin
      logos = []
      %w(w r o g b).each_with_index do |color, i|
        logos << { :src => "#{request.protocol}s3.amazonaws.com/storagelocator/images/ui/storagelocator/df-logo-#{color}.png", :class => 'default_logo', :alt => '', :'data-ci' => i }
      end
      logos
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
      html << "<form action='/#{@search.storage_type.try :parameterize}/#{@search.state.try :parameterize}/#{@search.city.try :parameterize}' method='get' class='more_results_form'>" + 
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
      text_field_tag 'listing[address]', nil, :class => 'required hintable small_text_field i', :title => 'Street Address'
    else
      !listing.address.blank? ? "#{listing.address}<br />" : ''
    end
  end
  
  def edit_listing_city_state_zip(listing)
    if listing.nil? || listing.new_record?
      (html ||= '') << text_field_tag('listing[city]', nil, :class => 'required hintable small_text_field i', :title => 'City')
      html << text_field_tag('listing[state]', nil, :class => 'required autocomplete hintable tiny_text_field i', :title => 'State', :'data-autocomp-source' => 'States_abbrevs', :maxlength => 2)
      html << text_field_tag('listing[zip]', nil, :class => 'numeric_zip hintable tiny_text_field i', :title => 'Zip')
      html
    else
      listing.city_state_zip
    end
  end
  
  def render_tab_nav
    @sizes_link    = link_to('Unit Sizes', '#', :rel => 'sl-tabs-sizes') unless @sizes.blank?
    @map_link      = link_to('Map', '#', :rel => 'sl-tabs-map')
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
      html = "Your <span id='sorted_by'>most relevant</span> listing is being displayed first"
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
    '' if @sizes.blank? && @features.blank? && @pictures.blank?
  end
  
  def claim_listing_link(listing, options = {})
    link_to 'Claim and Activate Free', claim_listing_path(listing), options.merge(:title => 'Claim this listing if you are the verifiable owner or manager')
  end
  
  def display_comparison(comparison, listing_set)
    listing = listing_set[:listing]
    size    = listing_set[:size]
    
    case comparison when 'distance'
      "<td class='padded' title='From #{@search.full_location}'>"+
        "<span class='hide'>#{listing.title} is within </span>#{sprintf '%.2f', listing.distance_from(@search.location)} Miles"+
      "</td>"
    
    when 'monthly_rate'
      "<td class='padded' title='The monthly rate applicable to the selected unit size'>"+
        (size ? "#{number_to_currency size.dollar_price}<br />for #{size.title.indef_article} unit." : '')+
      '</td>'
    
    when /(special)/i
      special = listing_set[:special]
      "<td class='padded' title='#{special.description if special}'>"+
        '<div class="specializer_wrap">'+
          "<span class='special_txt active' data-context='compare_wrap' data-listing-id='#{listing.id}' data-special-id='#{special.id if special}'>#{special.title if special}</span> "+
          (special ? render(:partial => 'predefined_specials/special_txt', :locals => { :listing => listing, :special => special, :context => 'compare_wrap' }) : 'N/A')+
        '</div>'+
      '</td>'
    
    when /(price)/i
      if size
        "<td id='calcfor_#{listing.id}' class='padded calculation' title='This price includes tax and the administrative fee applicable to the listing'>#{ajax_loader}</td>"
      else
        "<td class='padded'><span>N/A for this size</span></td>"
      end
    
    else # features
      if listing.facility_features.map {|f| f.title.underscore }.include? comparison.gsub('_', ' ')
        "<td><img src='http://s3.amazonaws.com/storagelocator/images/ui/storagelocator/green-checkmark.png' width='18' height='17' alt='#{listing.title} does have #{comparison.titleize}' /></td>"
      else
        "<td><span class='hide'>#{listing.title} does not have #{comparison.titleize}</span></td>"
      end
    end
  end
  
end
