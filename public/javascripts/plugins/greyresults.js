// Greyresults 
// Diego Salazar, Grey Robot, Inc. April, 2010
//

// multiple marker map on results page
$(function(){
	if (typeof GBrowserIsCompatible == 'function' && GBrowserIsCompatible() && typeof(Gmaps_data) != 'undefined' && $('#main_map').length > 0) {
		// Gmaps_data comes from a script rendered by the controller
		$.setGmap(Gmaps_data);
		
		$('.compare', '.listing').live('click', function(){
			var compare = $(this),
				listing = compare.parents('.listing'),
				i = $('.listing').index(listing);
			
			if (!compare.data('on')) {
				listing.addClass('active');
				compare.data('on', true);
				GmapMarkers[i].GmapState = 'selected';
				highlightMarker(i);

			} else {
				listing.removeClass('active');
				compare.data('on', false);
				GmapMarkers[i].GmapState = '';
				unhighlightMarker(i);

			}
		});
	}
	
	// bind event handlers and implement ajax functionality for search results.
	// first implemented for storage locator
	
	// opens the reserve form in the unit sizes tab in the single listing page
	$('.open_reserve_form').click(function(){
		var $this = $(this),
			rform = $('.reserve_form', $this.parent());

		if (rform.hasClass('active')) {
			rform.slideUp().removeClass('active');
			$('.sl-table').removeClass('active');
		} else {
			$('.reserve_form').slideUp().removeClass('active');
			$('.sl-table').removeClass('active');
			$('.sl-table', rform.parent()).addClass('active');
			rform.slideDown().addClass('active');
		}

		$('input[type=text]:first', rform).focus();
		return false;
	});

	$.convert_unit_size_row_values_to_inputs = function(container) {
		// values and such
		var sizes_li	= $('.st-size', container),
			type_li 	= $('.st-type', container),
			price_li 	= $('.st-pric', container),
			specials_li = $('.st-spec', container),
			load_li		= $('.st-sele', container),

			// to revert the content on cancel
			sizes_orig		= sizes_li.text(),
			type_orig		= type_li.text(),
			price_orig		= price_li.html(),
			specials_orig  	= specials_li.html(),

			// build the input fields with the original values preset
			x = sizes_orig.split(/\W?x\W?/)[0],
			y = sizes_orig.split(/\W?x\W?/)[1],
			xi = '<input type="text" size="3" maxlength="3" class="small_num i" name="size[x]" value="'+ x +'" />',
			yi = '<input type="text" size="3" maxlength="3" class="small_num i" name="size[y]" value="'+ y +'" />',
			ti = '<input type="text" class="small_text_field i" name="size[unit_type]" value="'+ (type_orig == 'NONE' ? '' : type_orig) +'" />',
			pi = '<input type="text" size="8" maxlength="8" class="small_text_field i" name="size[price]" value="'+ price_orig.replace('$', '') +'" />',
			si = '<input type="text" class="small_text_field i" name="size[special]" value="'+ (specials_orig == 'NONE' ? '' : specials_orig) +'" />';

			// replace the content in the unit size row
			sizes_li.css(sizes_li_adjustment).html(xi +' x '+ yi);
			type_li.html(ti);
			price_li.html('<span class="left">$ </span>'+ pi);
			specials_li.html(si);

		$('.cancel_link', container).click(function(){
			// revert to original content
			sizes_li.html(sizes_orig).css(sizes_li_revertment);
			type_li.html(type_orig);
			price_li.html(price_orig);
			specials_li.html(specials_orig);

			$('.edit-btn', container).text('Edit');
			$(this).hide();
			return false;
		});
	}

	$.clone_and_attach_inputs = function(inputs, context, form) {
		$(inputs, context).each(function(){ form.append($(this).clone()); });
	}

	$.post_new_unit_size_values_and_revert = function(container, hidden_form) {
		var sizes_li	= $('.st-size', container),
			type_li 	= $('.st-type', container),
			price_li 	= $('.st-pric', container),
			specials_li = $('.st-spec', container);

		$.clone_and_attach_inputs('input.i', container, hidden_form);

		$.post(hidden_form.attr('action'), hidden_form.serialize(), function(response){
			if (response.success) {
				// update the row with the new values
				var sizes_html = $('input[name="size[x]"]', container).val() +' x '+ $('input[name="size[y]"]', container).val();
				sizes_li.css(sizes_li_revertment).html(sizes_html);

				var type_html = $('input[name="size[unit_type]"]', container).val();
				type_li.html(type_html);

				var price_html = $('input[name="size[price]"]', container).val();
				price_li.html(price_html);

				var specials_html = $('input[name="size[special]"]', container).val();
				specials_li.html(specials_html);

				$('.edit-btn', container).text('Edit');
				$('.cancel_link', container).hide();

			} else alert('Error: '+ response.data);

			$('.st-sele', container).removeClass('active_load');

		}, 'json');
	}

	// edit functionality for the sizes in the facility edit page
	$('.edit-btn', '.authenticated .sl-table').click(function(){
		var $this 		= $(this),
			container 	= $this.parents('.sl-table'),
			hidden_form	= $('form:hidden', container.parent()),
			cancel_btn	= $('.cancel_link', container),
			load_li		= $('.st-sele', container);

		// we needed to adjust the size of the sizes li to stop the inputs within from breaking to a new line, we save the original css here to revert later
		sizes_li_adjustment = { 'margin-left': '13px', 'width': '67px' },
		sizes_li_revertment = { 'margin-left': '25px', 'width': '55px' };

		if ($(this).text() == 'Edit') {
			$.convert_unit_size_row_values_to_inputs(container);

			cancel_btn.show();
			$this.text('Save');

		} else if ($(this).text() == 'Save') {
			load_li.addClass('active_load'); // loading anim
			cancel_btn.hide();

			$.post_new_unit_size_values_and_revert(container, hidden_form);
		}

		return false;
	});

	// address and specials boxes, convert to form and handle ajax post
	$('.attr_edit', '.authenticated').live('click', function(){
		var $this 	   = $(this).css('display', 'inline'),
			container  = $this.parent(),
			rel 	   = $this.attr('rel'),
		 	cancel_btn = $('.cancel_btn', $this.parent());

		if ($this.text() == 'Edit') {
			cancel_btn.show();
			$this.text('Save').data('saving', false);

			if (rel == 'address') { // has spans for each address field, e.g. address, state, zip
				$('.address, .tags', container).children('span').each(function(){
					var el	  = $(this).hide(),
						attr  = el.attr('rel'),
						input = $('<input type="text" name="map['+ attr +']" class="small_text_field i '+ attr +'" value="'+ el.text() +'" title="'+ attr +'" />');

					el.after(input); // put input after span

				});
			} else if (rel == 'special') {
				var el	  = $('.sl-special', container).hide(),
					attr  = el.attr('rel'),
					input = $('<input type="text" name="listing['+ attr +']" class="small_text_field i '+ attr +'" value="'+ el.text() +'" title="'+ attr +'" />');

				el.after(input); // put input after span

			}

			cancel_btn.click(function(){
				$this.text('Edit').data('saving', false).attr('style', ''); // this allows the edit link to hide when mouse is not hovered over the container, see the css styles for #sl-fac-detail-in-edit
				cancel_btn.hide();
				$('.value', container).show();
				$('input.i', container).remove();
				return false;
			});

		} else if ($this.text() == 'Save' && !$this.data('saving')) {
			$this.data('saving', true);
			$('.ajax_loader', container).show();

			var hidden_form = $('form[rel='+ rel +']', container);
			$.clone_and_attach_inputs('input.i', container, hidden_form);

			$.post(hidden_form.attr('action'), hidden_form.serialize(), function(response){
				if (response.success) {
					$('input.i', container).each(function(){
						var input = $(this),
							val	  = input.val();

						input.prev('.value').text(val).show();
						input.remove();
					});

					$this.text('Edit').attr('style', ''); // this allows the edit link to hide when mouse is not hovered over the container, see the css styles for #sl-fac-detail-in-edit
					cancel_btn.hide();

				} else alert('Error: '+ response.data);

				$this.data('saving', false);
				$('.ajax_loader', container).hide();
			});
		}

		return false;
	});

	/* AJAX pagination, load next page results in the same page */
	$('#more_results').live('click', function(){
		var $this = $(this),
			ajax_loader = $('.ajax_loader', $this.parent()).show();

		$this.find('span').hide(); // the plus sign

		// params to build the url that will query the same data the visitor searched for, advanced one page
		var pagetitle = $('#params_pagetitle', $this.parent()).text(),
			query 	  = $('#params_query', $this.parent()).text(),
			within 	  = $('#params_within', $this.parent()).text(),
			page 	  = $('#params_page', $this.parent()).text();

		// to build each listing object
		var listing_clone = $('.listing:first').clone(),
			results_wrap = $('#rslt-list-bg');

		var url = '/'+ pagetitle +'?q=';
		if (query != '') url += query;
		if (within != '') url += '&within='+ within;
		if (page != '') url += '&page='+ page;
		
		$.getJSON(url, function(response){
			ajax_loader.hide();
			$this.find('span').show(); // the plus sign

			if (response.success) { // returned some listings
				// we get an array JSON objects, each represents a listing including related models attributes
				$.each(response.data, function(i){
					var info 		 = this.info, // listing attributes
						this_listing = listing_clone.clone().attr('id', 'listing_'+ info.id), // a new copy of a .listing div
						map 		 = this.map, // related model attributes
						specials	 = this.specials;

					// update tab urls
					var tabs = [
						$('.fac-map a', this_listing),
						$('.fac-sizes a', this_listing),
						$('.fac-specials a', this_listing),
						$('.fac-pictures a', this_listing)
					];

					for (var i = 0, len = tabs.length; i < len; i++) {
						if (tabs[i]) {
							var new_tab_href = tabs[i].attr('href').replace(/id=\d*/, 'id=' + info.id);
							tabs[i].attr('href', new_tab_href);
						}
					}

					// update the content in the copy of the listing html and add it to the dom
					$('.rslt-title a', this_listing)		.text(info.title);
					$('.rslt-title a', this_listing)		.attr('href', '/self-storage/show/' + info.id);
					$('.rslt-address', this_listing)		.text(map.address);
					$('.rslt-citystate', this_listing)		.text(map.city + ', ' + map.state + ' ' + map.zip);
					$('.rslt-phone', this_listing)			.text(map.phone);
					$('.rslt-miles span span', this_listing).text(parseFloat(map.distance).toPrecision(2));
					$('.rslt-specials h5', this_listing)	.text(specials.title);
					$('.rslt-specials p', this_listing)		.text(specials.cotent);

					this_listing.appendTo(results_wrap).hide().slideDown('slow');
					$('.inner:first', this_listing).effect('highlight', { color: '#c2cee9' }, 1700);
					//this_listing.greyresults();
				});

				// this updates the page count so the next time the user clicks, we pull the correct data
				$('#params_page', $this.parent()).text(parseInt(page) + 1);

				var range 		= $('#results_range'),
					range_start = parseInt(range.text().split('-')[0]),
					range_end 	= parseInt(range.text().split('-')[1]),
					per_page	= parseInt($('#per_page').text()),
					total 		= parseInt($('#results_total').text()),
					remaining	= total - (range_end + per_page);		

				// update the range text and adjust the range end if we're near the end of the data set
				range_end += parseInt($('#per_page').text());
				if (range_end >= total) range_end = total;
				range.text(range_start + '-' + range_end);

				if (remaining <= 0) $this.hide();
				if (remaining < per_page) $this.text('+ Show ' + remaining + ' more');
				
				// combine new map data with existing
				$.each(response.maps_data.maps, function(){ Gmaps_data.maps.push(this) });
				$.setGmap(Gmaps_data);
				
			} else alert('Ooops, try again');
		});

		return false;
	});

	// utitity method
	$.clicked_on_different_tab = function($tab_link, $listing) {
		var $open_panel = $('.panel:not(:hidden)', '.listing');
		if ($open_panel.length == 0) return true;

		var clicked_listing = $open_panel.parent().attr('id'),
			active_listing 	= $listing.attr('id');
		if (active_listing != clicked_listing) return true;

		var clicked_tab  = $tab_link.attr('rel'),
			active_panel = $open_panel.attr('rel');

		// true when clicking on a different tab in the same result, or the same tab in a different result
		return (clicked_tab != active_panel && active_listing == clicked_listing) || 
			   (clicked_tab == active_panel && active_listing != clicked_listing);
	}

	// panel openers
	$('.open_tab', '.tabs').live('click', function(){
		var $this = $(this),
			$panel = $('.panel', $this.parent().parent().parent());

		$('.open_tab').text('+');

		if (!$this.data('active')) {
			$('.tab_link[rel=map]', $this.parent().parent()).click();
			$this.data('active', true);
			$this.text('x');
		} else {
			$panel.slideUp();
			$('.tab_link, .listing, .panel, .tabs li').removeClass('active');
			$this.data('active', false);
			$('.open_tab').text('+');
		}

		return false
	});

	// slide open the panel below a result containing a partial loaded via ajax, as per the rel in the clicked tab link
	$('.tab_link', '.listing').live('click', function() {
		$('.open_tab', this).data('active', false);
		var $this		= $(this),
			$listing	= $this.parents('.listing'),
			$panel		= $('.panel', $listing).addClass('active'),
			$progress = $('.progress', $listing);

		// show progress and do ajax call unless we're clicking on the same tab again
		if ($.clicked_on_different_tab($this, $listing, $panel)) {
			$progress.addClass('active');
			$panel.attr('rel', this.rel);

			$.get(this.href, function(response) {
				$('.tab_link, .listing, .panel').removeClass('active');
				$('li', '.tabs').removeClass('active');
				$this.parent().addClass('active');

				$this.addClass('active');
				$listing.addClass('active');
				$panel.addClass('active');

				$('.panel:not(.active)').slideUp();
				$panel.html(response);

				$('.listing:not(.active) .open_tab').text('+');
				$('.open_tab', $listing).data('active', true).text('x');

				if ($panel.is(':hidden')) $panel.slideDown();
				$('.progress', '.listing').removeClass('active');

				// load the google map into an iframe
				if ($this.attr('rel') == 'map') {
					var $map_wrap = $('.map_wrap', $panel);
					$map_wrap.append('<iframe />');
					$('iframe', $map_wrap).src('/ajax/get_map_frame?model=Listing&id='+ $listing.attr('id').split('_')[1]);

				} else if ($this.attr('rel') == 'reserve') {
					$('.mini_calendar', $panel).datepicker();
					$('.datepicker_wrap', $panel).click(function(){ $('.mini_calendar', this).focus(); });
				}
			});
		}

		return false;
	})

	// narrow search form sliders
	$('.slider').each(function(){
		var $this = $(this),
				value = $('.slider_val', $this.parent()).val();

		$this.slider({
			max: 50,
			min:5,
			step: 5,
			animate: true,
			value: value, // reverse the direction of the slider
			start: function(e, ui) {
				var slider = $('.slider_val', $(e.target).parent());
				if (slider.attr('disabled')) slider.attr('disabled', false);
			},
			slide: function(e, ui) {
				$('.slider_val', $(this).parent()).val(ui.value);
			}
		});
	});
	
	$('form.new_reservation').live('submit', function(){
		var form = $(this).runValidation(),
			data = form.serialize();
			
		if (form.data('valid')/* && !form.data('saving')*/) {
			//form.data('saving', true);
			
			$.post(form.attr('action'), data, function(response){
				if (response.success) {
					var inner_panel = form.parent();
					inner_panel.children().fadeOut(300);
					inner_panel.animate({ height: '150px' }, 600, function(){
						
						inner_panel.html(
							'<div id="quote_done">\
								<h3>Got it! We\'ll send you the info ASAP</h3>\
								<p>\
									It is a long established fact that a reader will be distracted by the readable \
									content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal \
									distribution of letters, as opposed to using \'Content here, content here\', making it look like readable English.\
								</p>\
							</div>'
						);
					});
				
				} else $.ajax_error(response);
				
				form.data('saving', false);
			}, 'json');
		}
		
		return false;
	})
});

var MapIconMaker = {};
MapIconMaker.createMarkerIcon = function(opts) {
  var width = opts.width || 32;
  var height = opts.height || 32;
  var primaryColor = opts.primaryColor || "#ff0000";
  var strokeColor = opts.strokeColor || "#000000";
  var cornerColor = opts.cornerColor || "#ffffff";
   
  var baseUrl = "http://chart.apis.google.com/chart?cht=mm";
  var iconUrl = baseUrl + "&chs=" + width + "x" + height + 
      "&chco=" + cornerColor.replace("#", "") + "," + primaryColor.replace("#", "") + "," + strokeColor.replace("#", "") + "&ext=.png";
  var icon = new GIcon(G_DEFAULT_ICON);
  icon.image = iconUrl;
  icon.iconSize = new GSize(width, height);
  icon.shadowSize = new GSize(Math.floor(width*1.6), height);
  icon.iconAnchor = new GPoint(width/2, height);
  icon.infoWindowAnchor = new GPoint(width/2, Math.floor(height/12));
  icon.printImage = iconUrl + "&chof=gif";
  icon.mozPrintImage = iconUrl + "&chf=bg,s,ECECD8" + "&chof=gif";
  var iconUrl = baseUrl + "&chs=" + width + "x" + height + 
      "&chco=" + cornerColor.replace("#", "") + "," + primaryColor.replace("#", "") + "," + strokeColor.replace("#", "");
  icon.transparent = iconUrl + "&chf=a,s,ffffff11&ext=.png";

  icon.imageMap = [
      width/2, height,
      (7/16)*width, (5/8)*height,
      (5/16)*width, (7/16)*height,
      (7/32)*width, (5/16)*height,
      (5/16)*width, (1/8)*height,
      (1/2)*width, 0,
      (11/16)*width, (1/8)*height,
      (25/32)*width, (5/16)*height,
      (11/16)*width, (7/16)*height,
      (9/16)*width, (5/8)*height
  ];
  for (var i = 0; i < icon.imageMap.length; i++) {
    icon.imageMap[i] = parseInt(icon.imageMap[i]);
  }

  return icon;
}

try {
	var startIcon = new GIcon(G_DEFAULT_ICON, '/images/ui/map_marker.png');
	var iconOptions = {};
	iconOptions.width = 32;
	iconOptions.height = 32;
	iconOptions.primaryColor = "#0000ff";
	iconOptions.cornerColor = "#FFFFFF";
	iconOptions.strokeColor = "#000000";
	var normalIcon = MapIconMaker.createMarkerIcon(iconOptions);

	//save the regular icon image url
	var normalIconImage = normalIcon.image,
		highlightIconImage = 'http://chart.apis.google.com/chart?cht=mm&chs=32x32&chco=FFFFFF,FBD745,000000&ext=.png',
		selectedIconImage = 'http://chart.apis.google.com/chart?cht=mm&chs=32x32&chco=FFFFFF,FB9517,000000&ext=.png';
} catch (e){}

function highlightMarker(ind){
	GmapMarkers[ind].setImage(highlightIconImage);
}

function unhighlightMarker(ind){
	if (GmapMarkers[ind].GmapState == 'selected') GmapMarkers[ind].setImage(selectedIconImage);
	else GmapMarkers[ind].setImage(normalIconImage);
}

function addMarker(icon, lat, lng, title, body){
	var point = new GLatLng(lat, lng);
	var marker = new GMarker(point, { 'title': title, 'icon': icon, width: '25px' });
	
	GEvent.addListener(marker, 'click', function(){
		marker.openInfoWindowHtml(body);
	});
	
	Gmap.addOverlay(marker);
	return marker;
}

GmapMarkers = [];
$.setGmap = function(data) {
	Gmap = new GMap2(document.getElementById('main_map'));
	Gmap.addControl(new GLargeMapControl());
	Gmap.addControl(new GScaleControl());
	Gmap.addControl(new GMapTypeControl());
	Gmap.setCenter(new GLatLng(data.center.lat, data.center.lng), 12);
	Gmap.enableDoubleClickZoom();
	Gmap.disableContinuousZoom();
	Gmap.disableScrollWheelZoom();
	addMarker(startIcon, parseFloat(data.center.lat), parseFloat(data.center.lng), 'Your Are here', 'You are here');
	
	//add result markers
	var markers = data.maps;
	
	for (var i = 0, len = markers.length; i < len; i++){
		if(markers[i].photo) photo = "<img style=\"margin-right:4px\" src="+ markers[i].thumb +" width=\"80\" height=\"60\" align=\"left\"/>";
		else photo = '';
		
		var title = markers[i].title;
		var body = '<p>'+ photo + '<span class="listing_title"><a href="/self-storage/show/'+ markers[i].id +'">'+ title +'</a></span><span class="listing_address">'+ markers[i].address +'<br/>'+ markers[i].city +', '+ markers[i].state +' '+ markers[i].zip +'</span></p>';
		var marker = addMarker(normalIcon, markers[i].lat, markers[i].lng, title, body);
		GmapMarkers[i] = marker;
	}
	
	//bind mouseover result row to highlight map marker
	jQuery('.listing').hover(function(){
		var i = $('.listing').index(this);
		highlightMarker(i);
		
	}, function(){
		var i = $('.listing').index(this);
		unhighlightMarker(i);
		
	});
	
} // END setGmap()
