// Greyresults 
// Diego Salazar, Grey Robot, Inc. April, 2010
// functionality specific to the listings results of USSelfStorageLocator.com
// for both back end (client control panel) and front end (search results)

$(function(){
	/*
	 * BACK END, listing owner page methods
	 */

	
	// edit functionality for the sizes in the facility edit page
	$('.edit-btn', '.authenticated .sl-table').live('click', function(){
		var $this 		= $(this),
			container 	= $this.parents('.sl-table-wrap'),
			hidden_form	= $('form:hidden', container),
			cancel_btn	= $('.cancel_link', container).attr('rel', $this.attr('rel')), // the cancel btn's rel dictates whether it should remove the size (new size) or revert it (existing size)
			delete_btn  = $('.delete_link', container),
			load_li		= $('.st-sele', container);

		if ($this.text() == 'Edit') {
			hidden_form.find('input[name=_method]').val('put');
			$.convert_unit_size_row_values_to_inputs(container, cancel_btn, delete_btn);
			$this.text('Save');

		} else if ($this.text() == 'Save') {
			load_li.addClass('active_load'); // loading anim
			$.post_new_unit_size_values_and_revert(container, hidden_form, cancel_btn, delete_btn);
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
			
			$('.attr_wrap', container).children('.field_group').each(function(){
				var model = $(this).attr('rel');
				
				$('.value', this).each(function(){
					var field = $(this).hide(), attr = field.attr('rel');
					field.after('<input type="text" name="'+ model+ '['+ attr +']" class="small_text_field i '+ attr +'" value="'+ field.text() +'" title="'+ capitalize(attr.replaceAll('_', ' ')) +'" />');
				});
			});
			
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
				$.with_json(response, function(data){
					$('input.i', container).each(function(){
						var input = $(this),
							val	  = input.val();

						input.prev('.value').text(val).show();
						input.remove();
					});

					$this.text('Edit').attr('style', ''); // this allows the edit link to hide when mouse is not hovered over the container, see the css styles for #sl-fac-detail-in-edit
					cancel_btn.hide();
				});

				$this.data('saving', false);
				$('.ajax_loader', container).hide();
			});
		}

		return false;
	});
	
	$('.facility_feature', '.edit_action #sl-tabs-feat').click(function(){
		var $this = $(this),
			feature = encodeURIComponent($this.find('input').val().replaceAll(' ', '-')),
			ajax_loader = $('.ajax_loader', '#sl-tabs-feat').eq(0),
			path = '/clients/'+ $('#client_id').val() +'/listings/'+ $('#listing_id').val() +'/facility_features/'+ feature;
		
		$this.after(ajax_loader.show()).siblings('.f').hide();
		path += $this.hasClass('selected') ? '/false' : '/true';
		
		$.post(path, {}, function(response) {
			$.with_json(response, function(data){
				$this.toggleClass('selected');
				update_info_tab_count('Features', $this.hasClass('selected') ? 1 : -1);
			});
			
			$this.siblings('.f').show();
			ajax_loader.hide();
		}, 'json');
	});
	
	// add custom feature
	$('input[type=text]', '#new_facility_feature').focus(function(){
		$(this).next('#facility_feature_submit').show('fast');
	});
	$('input[type=text]', '#new_facility_feature').blur(function(){
		var $this = $(this);
		setTimeout(function(){ $this.next('#facility_feature_submit').hide('fast') }, 300);
	});
	$('#new_facility_feature').submit(function(){
		var form = $(this);
		
		$.post(form.attr('action'), form.serialize(), function(response){
			$.with_json(response, function(data) {
				$.log(data);
			});
		});
		
		return false;
	});
	
	/*
	 * FRONT END, results page
	*/
	
	// narrow search form sliders
	$('.slider').each(function(){
		var $this = $(this),
			value = $('.slider_val', $this.parent()).val();

		$this.slider({
			max: 50,
			min:5,
			step: 5,
			animate: true,
			value: value,
			start: function(e, ui) {
				var slider = $('.slider_val', $(e.target).parent());
				if (slider.attr('disabled')) slider.attr('disabled', false);
			},
			slide: function(e, ui) {
				$('.slider_val', $(this).parent()).val(ui.value);
			}
		});
	});
	
	$compare_btns = $('input[name=compare]', '.listing');
	$compare_btns.live('change', function(){
		var compare	= $(this), listing = compare.parents('.listing'),
			blank_compare_href = $('.compare a', '.listing').eq(0).attr('href'),
			id = compare.val(), marker, compare_links;
		
		if (typeof Gmaps_data != 'undefined') marker = getMarkerById(id);
		
		if (compare.is(':checked')) {
			listing.addClass('active');
			
			compare_links = $('.compare a', '.listing.active');
			if (compare_links.length >= 2) {
				$('a', '.active .compare').show();
				$('label', '.active .compare').hide();
			}
			
			if (marker) {
				marker.GmapState = 'selected';
				highlightMarker(marker);
			}
		} else {
			$('a', compare.parent()).hide();
			$('label', compare.parent()).show();
			
			compare_links = $('.compare a', '.listing.active');
			if (compare_links.length <= 2) {
				$('a', '.active .compare').hide();
				$('label', '.active .compare').show();
			}
			
			listing.removeClass('active');
			
			if (marker) {
				marker.GmapState = '';
				unhighlightMarker(marker);
			}
		}
	});
	
	$('input[name=compare]', '.compare').each(function() {
		var $this = $(this);
		if ($this.is(':checked')) $this.attr('checked', false);
	});
	
	$('a', '.compare').live('click', function() {
		var $this = $(this).hide(),
			orig_href = $this.attr('href'),
			compares = $('input:checked', '.compare'),
			ajax_loader = $.new_ajax_loader('after', $this).show();
		
		if (compares.length) {
			compares.each(function(){ 
				$this[0].href += this.value +',';
			});
			
			$.getJSON(this.href, function(response) {
				$.with_json(response, function(data) {
					var pop_up = $('<div id="pop_up">'+ data['html'] +'</div>').dialog(default_pop_up_options({ 
						title: 'Comparing '+ compares.length +' Facilities',
						width: 'auto',
						height: 'auto',
						modal: false
					}));
					
					$.setGmap(data['maps_data'], 'compare_map');
				});
				
				$this.show();
				ajax_loader.remove();
				$this.attr('href', orig_href);
			});
		}  
		
		return false;
	});

	/* AJAX pagination, load next page results in the same page */
	$('.more_results').live('click', function(){
		var $this 	 	 = $('.more_results'),
			this_form 	 = $this.parents('form'),
			results_wrap = $('#rslt-list-bg'),
			plus_sign 	 = $this.find('span > span').hide(),
			ajax_loader  = $('.ajax_loader', $this).show(),
			last_index   = parseInt($('.num_icon', '.listing:last').text()) + 1,
			page = $('span[name=params_page]', $this.parent()).eq(0).text();
		
		if (!this_form.data('submitting')) {
			this_form.data('submitting', true);
			
			$.getJSON(this_form.attr('action'), this_form.serialize(), function(response) {
				$.with_json(response, function(data) {
					for (var i = 0, len = data.length; i < len; i++) {
						var listing = $(data[i]);
						$('.num_icon', listing).text(last_index + i);
						results_wrap.append(listing);
					}

					// this updates the page count so the next time the user clicks, we pull the correct data
					$('span[name=params_page]').text(parseInt(page) + 1);

					var range 		= $('.results_range'),
						range_start = parseInt(range.eq(0).text().split('-')[0]),
						range_end 	= parseInt(range.eq(0).text().split('-')[1]),
						per_page	= parseInt($('#per_page').text()),
						total 		= parseInt($('.results_total').eq(0).text()),
						remaining	= total - (range_end + per_page);		

					// update the range text and adjust the range end if we're near the end of the data set
					range_end += parseInt($('#per_page').text());
					if (range_end >= total) range_end = total;
					range.text(range_start + '-' + range_end);

					if (remaining <= 0) $this.hide();
					if (remaining < per_page) $this.find('span').html('<span class="plus">+</span> Show ' + remaining + ' more');
				});

				ajax_loader.hide();
				plus_sign.show();
				this_form.data('submitting', false);
			});
		}

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
	
	$.activate_datepicker = function(context) {
		$('.mini_calendar', context).datepicker();
		$('.datepicker_wrap', context).click(function(){ $('.hasDatepicker', this).focus(); });
	}

	// panel openers
	$('.open_tab', '.tabs').live('click', function(){
		var $this = $(this),
			$panel = $('.panel', $this.parent().parent().parent());

		$('.open_tab').text('+');

		if (!$this.data('active')) {
			$('.tab_link[rel=map]', $this.parent().parent()).click();
			$this.data('active', true);
			$this.text('-');
		} else {
			$panel.slideUp();
			$('.tab_link, .listing, .panel, .tabs li').removeClass('active');
			$this.data('active', false);
			$('.open_tab').text('+');
		}

		return false
	});
	
	// when the reserve btn is clicked check to see if there is a chosen unit type. if so, change the buttons href
	$('.reserve_btn, .request_btn', '.listing').live('click', function(){
		var $this = $(this), 
			new_href = $this.attr('href').replace('/sizes', ($this.hasClass('reserve_btn') ? '/reserve' : '/info_request')),
			unit_size = $(':radio:checked', $this.parent().parent());
		
		if (unit_size.length) {
			$this.attr('href', new_href +'&sub_model=Size&sub_id='+ unit_size.val());
			$this.attr('rel', 'reserve');
		}
	});

	// slide open the panel below a result containing a partial loaded via ajax, as per the rel attr in the clicked tab link
	$('.tab_link', '.listing').live('click', function() {
		$('.open_tab', this).data('active', false);
		var $this		= $(this),
			$listing	= $this.parents('.listing'),
			$panel		= $('.panel', $listing).addClass('active'),
			$progress = $('.progress', $listing);

		// show progress and do ajax call unless we're clicking on the same tab again
		if ($.clicked_on_different_tab($this, $listing, $panel)) {
			$progress.addClass('active').animate({ 'margin-top': 0 }, 'fast');
			$panel.attr('rel', this.rel);

			$.getJSON(this.href, function(response) {
				$.with_json(response, function(data){
					$('.tab_link, .listing, .panel').removeClass('active');
					$('li', '.tabs').removeClass('active');
					$this.parent().addClass('active');

					$this.addClass('active');
					$listing.addClass('active');
					$panel.addClass('active');

					$('.panel:not(.active)').slideUp();
					$panel.html(data);

					$('.listing:not(.active) .open_tab').text('+');
					$('.open_tab', $listing).data('active', true).text('-');

					if ($panel.is(':hidden')) {
						$panel.slideDown(900, function(){ if ($(window).height() < 650) $(window).scrollTo($listing, { speed: 1000 }); });
					}

					$('.progress', '.listing').removeClass('active').animate({ 'margin-top': '-16px' }, 'fast');

					// load the google map into an iframe
					if ($this.attr('rel') == 'map') {
						$('.hintable', $panel).hinty();
						var $map_wrap = $('.map_wrap', $panel), latlng = $map_wrap.attr('rel').split(',').map(function(i) { return parseFloat(i) });
						
						$map_wrap.jmap('init', { 'mapCenter': latlng }, function(map, el, ops) {
							$map_wrap.jmap('AddMarker', {
								'pointLatLng': ops.mapCenter,
								'pointHTML': $('.rslt-title', $listing).html() + $('.rslt-contact', $listing).html()
							});
						});
						
						setTimeout(function() {
							$map_wrap.jmap('CheckResize');
						}, 1000);

					} else if ($this.attr('rel') == 'reserve') {
						$('#rent_step1 form', $panel).rental_form();
					}
				});
			});
			
		} else {
			$panel.slideUp();
			$('.tab_link, .listing, .panel').removeClass('active');
			$('li', '.tabs').removeClass('active');
		}

		return false;
	});
	
	$('#get_dirs').live('submit', function() {
		var form = $(this),
			map_container = form.parents('#'+ form.attr('data-container')),
			map_wrap = $('#'+ form.attr('data-wrap'), map_container),
			from = $('#from_address', form).val(), 
			to = form.attr('data-to-addr'),
			dirs = $('<div id="dirs" />');
		
		map_container.after(dirs);
		map_container.parent().prepend('<img src="/images/ui/storagelocator/usselfstoragelocator-sml.png" class="dp" />');
		
		map_wrap.jmap('SearchDirections', {
			'query': from + ' to '+ to,
			'panel': $('#dirs', map_container.parent()),
			'locale': 'en_US'
		}, function() {
			$('.ps', map_container.parent()).show();
		});
		
		return false;
	});
	
	// opens the unit size specific reserve or request form in the unit sizes tab
	var unit_size_form_partials = {}; // cache the forms here
	$('.open_reserve_form').live('click', function(){
		var $this = $(this), rform = $('.reserve_form', $this.parent()),
			wrap = $this.parent('.sl-table-wrap'),
			listing_id = wrap.attr('rel').replace('listing_', ''),
			size_id = wrap.attr('id').replace('Size_', ''),
			accepts_reservations = wrap.attr('has-res') == 'true' ? true : false,
			ajax_loader = $('.ajax_loader', this);
			
		if (rform.hasClass('active')) { // clicking on an open form, close it
			rform.slideUp().removeClass('active');
			$('.sl-table').removeClass('active');
			
		} else { // get or open the form for this size
			$('.reserve_form').slideUp().removeClass('active');
			$('.sl-table').removeClass('active');
			$('.sl-table', rform.parent()).addClass('active');
			
			if (unit_size_form_partials[size_id]) rform.slideDown().addClass('active');
			else {
				ajax_loader.show();
				
				if (accepts_reservations) { // we must get the reserve partial that contains the reserve_steps
					get_partial_and_do({ partial: 'views/partials/greyresults/reserve', model: 'Listing', id: listing_id, sub_model: 'Size', sub_id: size_id }, function(response) {
						unit_size_form_partials[size_id] = response.data;
						rform.html(response.data).slideDown().addClass('active');
						ajax_loader.hide();
						$('#rent_step1 form', rform).rental_form();
					});
				} else {
					get_partial_and_do({ partial: 'views/partials/greyresults/request_info', model: 'Listing', id: listing_id, sub_model: 'Size', sub_id: size_id }, function(response) {
						unit_size_form_partials[size_id] = response.data;
						rform.html(response.data).slideDown().addClass('active');
						
						ajax_loader.hide();
						$.activate_datepicker(rform);
						$('.numeric_phone', rform).formatPhoneNum();
					});
				}
			}
		}

		$('input[type=text]:first', rform).focus();
		return false;
	});
	
	// used to wrap common functionality in the submit actions of step 1 and 2 in the reservation workflow
	// returns true so the workflow can go to the next slide
	function bool_submit_once_and_do(form, wizard, slide_num, callback) {
		var next_slide = $(wizard.slides[slide_num-1]),
			ajax_loader = $('.ajax_loader', next_slide);
			
		if (!form.data('submitted')) form.runValidation();
		
		if (!form.data('submitted') && form.data('valid')) {
			form.data('submitted', true).save_state(); // in case the user clicked back and changed an input value
			ajax_loader.show();
			
			submit_reservation_form(form, next_slide, ajax_loader, callback);
			return true; // while the form is submitting, this function returns true and causes the workflow to move next
			
		} else if (form.data('submitted') && form.state_changed()) { // user has gone back and changed some inputs 
			ajax_loader.show();
			
			if (slide_num == 2) {
				// get the reservation id so the server can update it
				var step2 = $('#reserve_step2', wizard.workflow).children().hide().end(),
					reservation_id = $('form', step2).attr('action').split('/');

				reservation_id = reservation_id[reservation_id.length-1];
				form.append('<input type="hidden" name="reservation_id" value="'+ reservation_id +'" />');
			} else if (slide_num == 3) {
				
			}
			
			form.save_state();
			submit_reservation_form(form, next_slide, ajax_loader, callback);
			return true;
			
		} else if (form.data('submitted')) return true;
		
		return false;
	}
	
	function submit_reservation_form(form, next_slide, ajax_loader, callback) {
		$.post(form.attr('action'), form.serialize(), function(response) {
			$.with_json(response, function(data) {
				callback.call(this, data, next_slide);
			}, function(data) { // error
				next_slide.html(data);
			});
			
			ajax_loader.hide();
		});
	}
	
	// Info request: submit reserver details
	$('form.new_listing_request').live('submit', function() {
		var form = $(this).runValidation(),
			ajax_loader = $('.ajax_loader', form).show();
		
		if (form.data('valid') && !form.data('saving')) {
			form.data('saving', true);
			$('.flash', form).slideUp('slow', function(){ $(this).remove() });
			
			$.post(form.attr('action'), form.serialize(), function(response) {
				if (response.success) {
					var inner_panel = form.parent();
					inner_panel.children().fadeOut(300, function(){
						inner_panel.html(response.data).children().hide().fadeIn();
						$('.hintable', inner_panel).hinty();
					});
				} else form.prepend('<div class="flash flash-error">'+ (typeof(response.data) == 'object' ? response.data.join('<br />') : response.data) +'</div>');
				
				ajax_loader.hide();
				form.data('saving', false);
			}, 'json');
		} else ajax_loader.hide();
		
		return false;
	});
	
	$('.tos').live('click', function(){
		get_pop_up_and_do({ title: 'Terms of Service', modal: true }, { sub_partial: 'pages/terms_of_service' });
		return false;
	});
	
	// autoreload the results
	$('select.auto', '#narrow_results_form').change(function() {
		delayed_submit(this);
	});
	
	$('.auto:not(select)', '#narrow_results_form').click(function() {
		delayed_submit(this);
	});
	
	var feature_toggle = $('.toggle_action', '#unit_features');
	if (feature_toggle.length) {
		feature_toggle.data('orig', feature_toggle.text());
		
		feature_toggle.click(function() {
			var $this = $(this);

			if (!$this.data('open')) {
				$this.data('open', true);
				$this.text('Less Features');
			} else {
				$this.data('open', false);
				$this.text($this.data('orig'));
			}
		});
	}
	
	function delayed_submit(input) {
		setTimeout(function() {
			$(input).parents('form').submit();
		}, 100);
	}
	
	$('#narrow_results_form').submit(function() {
		var form = $(this).runValidation(), 
			results_page = $('#ajax_wrap_inner'),
			results_wrap = $('#results_wrap', results_page),
			results_head = $('.rslt-head-txt', results_wrap),
			ajax_loader = '<img src="/images/ui/ajax-loader-long-green.gif" class="ajax_loader" style="display:block;" />';
		
		$('#type-one-top-bar', results_wrap).fadeTo(500, .5);
		results_head.html(ajax_loader);
		
		if (form.data('valid') && !form.data('loading')) {
			form.data('loading', true);
			
			$.getJSON(form.attr('action'), form.serialize(), function(response) {
				$.with_json(response, function(data) {
					results_page.replaceWith(data['results']);
					$.setGmap(data['maps_data']);
					$('a', '.rslt-features').tooltip();
					
					$('.rslt-price', '.listing').each(function(){
						$(':radio', this).eq(0).attr('checked', true);
						$('.radio_select', this).eq(0).addClass('checked');
					});
				});
				
				$('body').attr('id', 'listings_controller').addClass('locator_action'); // this is only needed cuz the layout is kinda fucked up and not consistent across pages
				form.data('loading', false);
			});
		}
		
		return false;
	});
	
	$('.list_sort').live('click', function() {
		var $this = $(this),
			form = $('#narrow_results_form'),
			sort_fields = $('.sort_field', form);
		
		if (!sort_fields.length) {
			sort_fields = '<input type="hidden" name="search[sorted_by]" class="sort_field" value="'+ $this.attr('data-sort') +'" />' +
						  '<input type="hidden" name="search[sort_num]" class="sort_field" value="'+ $this.attr('data-sort_num') +'" />';
			console.log(sort_fields)
			form.append(sort_fields);
		} else {
			var sort_num = sort_fields.find('input[name="search[sort_num]"]'),
				sorted_by = sort_fields.find('input[name="search[sorted_by]"]');
			console.log(sort_num, sorted_by)
			sort_num.val(parseInt(sort_num.attr('data-sort_num')) + 1);
			sorted_by.val($this.attr('data-sort'));
		}
		
		form.submit();
		
		return false;
	});
	
	
	
	var search_page = $('#page-cnt', '#listings_controller.home_action');
	if (search_page.length) {
		var main_map = $('#main_map', '#content'),
			latlng = main_map.attr('data-latlng').split(',');
		
		$.setGmap({ center: { lat: parseFloat(latlng[0]), lng: parseFloat(latlng[1]), zoom: 14 }, maps: [] });
		$('#narrow_results_form').submit();
	}
	
	var featured_listing = $('#feat_wrap');
	if (!featured_listing.children().length) {
		get_partial_and_do({ partial: 'listings/featured' }, function(response) {
			$.with_json(response, function(partial) {
				featured_listing.replaceWith(partial);
			});
		});
	}
	
	var google_map = $('#google_map');
	if (google_map.length) {
		var coords = $.map(google_map.attr('data-coords').split(','), function(el, i) { return parseFloat(el) });
		
		google_map.jmap('init', { 'mapCenter': coords }, function(map, el, ops) {
			google_map.jmap('AddMarker', {
				'pointLatLng': coords,
				'pointHTML': $('#fac_name span').text()
			});
		});
	}
	
	var street_view = $('#street_view');
	if (street_view.length) {
		var coords = $.map(google_map.attr('data-coords').split(','), function(el, i) { return parseFloat(el) });
		
		street_view.jmap('init', { 'mapType': G_HYBRID_MAP, 'mapCenter': coords }, function(map, el, ops) {
			street_view.jmap('CreateStreetviewPanorama', { 'latlng': coords });
		});
	}
	
	$('form', '#rent_step1').rental_form();
	
});

/*
 * Google Map methods
 */
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
	var iconOptions = {};
	iconOptions.width = 32;
	iconOptions.height = 32;
	iconOptions.primaryColor = "#0000ff";
	iconOptions.cornerColor = "#FFFFFF";
	iconOptions.strokeColor = "#000000";
	var normalIcon = MapIconMaker.createMarkerIcon(iconOptions);

	// http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=A|00CC99|000000
	
	var startIcon = new GIcon(G_DEFAULT_ICON, '/images/ui/map_marker.png'); // the 'you are here' icon
	
	//save the regular icon image url
	var normalIconImage = normalIcon.image,
		highlightIconImage = 'http://chart.apis.google.com/chart?cht=mm&chs=32x32&chco=FFFFFF,FBD745,000000&ext=.png',
		selectedIconImage = 'http://chart.apis.google.com/chart?cht=mm&chs=32x32&chco=FFFFFF,FB9517,000000&ext=.png';

} catch (e){ }

function highlightMarker(id){
	var marker = typeof id == 'object' ? id : getMarkerById(id);
	marker.setImage('http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld='+ marker.mIndex +'|FED747|333333');
}

function unhighlightMarker(id){
	var marker = typeof id == 'object' ? id : getMarkerById(id);
	if (marker.GmapState == 'selected') marker.setImage('http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld='+ marker.mIndex +'|FED747|333333');
	else marker.setImage('http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld='+ marker.mIndex +'|339933|FFFFFF');
}

function getMarkerById(id) {
	var marker;

	$.each(GmapMarkers, function(){
		if (this.listing_id == id) {
			marker = this;
			return;
		}
	});

	return marker;
}

function addMarker(icon, lat, lng, title, body, bind_mouse_overs) {
	if (typeof bind_mouse_overs == 'undefined') var bind_mouse_overs = true;
	
	var point = new GLatLng(lat, lng);
	var marker = new GMarker(point, { 'title': title, 'icon': icon, width: '25px' });
	
	GEvent.addListener(marker, 'click', function(){
		marker.openInfoWindowHtml(body);
		$('.listing').removeClass('active');
		$('#listing_'+ marker.listing_id).addClass('active');
	});
	
	if (bind_mouse_overs) {
		GEvent.addListener(marker, 'mouseover', function(){
			$('.listing').removeClass('active');
			highlightMarker(marker);
			$('#listing_'+ marker.listing_id).addClass('active');
		});

		GEvent.addListener(marker, 'mouseout', function(){
			$('#listing_'+ marker.listing_id).removeClass('active');
			unhighlightMarker(marker);
		});
	}

	Gmap.addOverlay(marker);
	return marker;
}

function make_indexed_icon(index) {
	return new GIcon(G_DEFAULT_ICON, 'http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld='+ index +'|339933|FFFFFF');
}

GmapMarkers = [];
$.setGmap = function(data, el) {
	if (typeof el == 'undefined') el = 'main_map';
	
	Gmap = new GMap2(document.getElementById(el));
	Gmap.addControl(new GLargeMapControl());
	Gmap.addControl(new GScaleControl());
	Gmap.addControl(new GMapTypeControl());
	Gmap.setCenter(new GLatLng(data.center.lat, data.center.lng), (data.center.zoom || 16));
	Gmap.enableDoubleClickZoom();
	Gmap.disableContinuousZoom();
	Gmap.disableScrollWheelZoom();
	
	addMarker(startIcon, parseFloat(data.center.lat), parseFloat(data.center.lng), 'Origin', '<p><strong>Search distance measured from here.</strong></p>', false);

	//add result markers
	var markers = data.maps;

	for (var i = 0, len = markers.length; i < len; i++) {
		var photo = markers[i].thumb ? "<a href=\"/self-storage/show/"+ markers[i].id +"#pictures\"><img style=\"margin-right:7px;border:1px solid #ccc;\" src="+ markers[i].thumb +" width=\"80\" height=\"60\" align=\"left\" /></a>" : '';
		var title = markers[i].title;
		var body = '<p>'+ photo + 
						'<span class="listing_title"><a href="/self-storage/show/'+ markers[i].id +'">'+ title +'</a></span>'+ 
						'<span class="listing_address">'+ markers[i].address +'<br/>'+ markers[i].city +', '+ markers[i].state +' '+ markers[i].zip +'</span>'+
					'</p>';
		
		var marker = addMarker(make_indexed_icon(i+1), markers[i].lat, markers[i].lng, title, body);
		marker.mIndex = i+1;
		marker.listing_id = markers[i].id;

		GmapMarkers[i] = marker;
	}

	//bind mouseover result row to highlight map marker
	jQuery('.listing').live('mouseenter', function(){
		var id = $(this).attr('id').split('_')[1];
		highlightMarker(id);
	});
	
	jQuery('.listing').live('mouseleave', function(){
		var id = $(this).attr('id').split('_')[1];
		unhighlightMarker(id);
	});

} // END setGmap()

// updates the info tab count in the listings edit page. the tab text is: <label> (<count>)
function update_info_tab_count(label, i) {
	var	tab = $('#tab_'+ label, '#sl-tabs'),
		count = parseInt(tab.text().split('(')[1].replace(')', '')) + i;
	
	tab.text(label.replace('_', ' ') + ' ('+ count +')');
}

// make an auto updating form, when values change, update the total
$.fn.rental_form = function() {
	function update_end_date(limit, calendar, multiplier, has_special, prorated, form) {
		if (typeof limit == 'undefined') var limit = 1;
		
		// adjust the paid through date, the specials dictate how many months to pay
		var paid_through  = $('.paid_through', form),
			move_date 	  = new Date(calendar.val()),
			limit		  = parseInt(limit),
			days_in_month = 32 - new Date(move_date.getFullYear(), move_date.getMonth(), 32).getDate(),
			half_month 	  = Math.floor(days_in_month / 2),
			end_date 	  = new Date(move_date.getFullYear(), move_date.getMonth() + limit, move_date.getDate() - 1);
		
		if (prorated) {
			if (limit == 1 && (move_date.getDate() > half_month || has_special)) {
				multiplier += 1.00;
				end_date = new Date(move_date.getFullYear(), move_date.getMonth() + limit, days_in_month - 1);
				
			} else end_date = new Date(move_date.getFullYear(), move_date.getMonth() + limit - 1, days_in_month);
		}
		
		paid_through.text(end_date.getMonth() + 1 +'/'+ end_date.getDate() +'/'+ end_date.getFullYear());
		return multiplier;
	}
	
	function special_calc(calc, subtotal, month_rate, multiplier) {
		var discount = 0;
		
		switch (calc[1]) {
			case 'm': discount = month_rate * parseFloat(calc[0]); break;
			case '%': discount = subtotal * (parseFloat(calc[0]) / 100.00); break;
			default : discount = parseFloat(calc[0]);
		}
		
		if (multiplier > 0.5 && multiplier <= 1) discount *= multiplier;
		return discount.toFixed(2);
	}

	function set_size_select(select, unit_type) {
		var show_count = 0;

		select.children().each(function() {
			var $this = $(this);

			if (unit_type != $this.attr('data-unit-type').toLowerCase()) 
				$this.hide();
			else {
				$this.show();
				if (show_count == 0) select.val($this.val());
				show_count++;
			}
		});

		select.change();
	}
	
	function update_totals(multiplier, rate, calendar, special, admin_fee, month_rate, tax_rate, tax_text, total_text, has_special, prorated, form) {
		var subtotal = rate,
			total 	 = subtotal,
			discount = 0,
			tax_amt	 = 0;
			
		if (special.length) {
			var calc = special.attr('data-special-calc').split('|'),
				discount = special_calc(calc, rate * (calc[2] || 1), parseFloat(month_rate.eq(0).text()), multiplier);
		}
		
		multiplier = update_end_date((calc ? (calc[2] || 1) : 1), calendar, multiplier, has_special, prorated, form);
		subtotal *= multiplier;
		
		$('.dur', form).text(multiplier);
		$('.subtotal span', form).text(subtotal.toFixed(2));
		$('.discount span span', form).text(discount);
		
		total = subtotal;
		total -= discount;

		if (!isNaN(admin_fee)) total += admin_fee;
		if (!isNaN(tax_rate))  tax_amt = total * tax_rate;

		total += tax_amt;
		tax_text.text(tax_amt.toFixed(2));
		total_text.text(total.toFixed(2));
	}
	
	var rent_workflow = {
		slides : [
			{
				div_id  : 'rent_step1',
				nav_vis : [
					['next', 'hide'],
					['back', 'fadeOut'] 
				],
				action : function(wizard) {
					$('.submit_btn', wizard.workflow).unbind('click').bind('click', function() {
						wizard.next();
						return false;
					});
				},
				validate : function(wizard) {
					
				} // END validate
			}, // END slide 1
			{ 
				div_id  : 'rent_step2',
				nav_vis : [
					['next', 'fadeIn'],
					['back', 'fadeIn']
				],
				action : function(wizard) {
					
				},
				validate : function(wizard) {
					
				} // END validate
			}
		],
		finish_action : function(wizard) {
			console.log('done')
		}
	};
	
	return this.each(function() {
		var form 		 = $(this),
			prorated	 = (form.attr('data-pr') == '1' ? true : false),
			type_select  = $('select[name=unit_type]', form),
			unit_type 	 = type_select.val().toLowerCase(),
			sizes_select = $('select[name="rental[size_id]"]', form),
			month_rate   = $('.rental_rate', form),
			admin_fee 	 = parseFloat($('.admin_fee span span', form).text()),
			tax_rate 	 = parseFloat($('.tax', form).attr('data-tax')),
			tax_text	 = $('.tax span span', form),
			total_text	 = $('.total span span', form),
			calendar	 = $('.cal', form).datepicker({
				onSelect: function(date, ui) {
					form.trigger('recalc');
				}
			});
		
		form.bind('recalc', function() {
			var rate = parseFloat(month_rate.eq(0).text()),
				special = $('input[name="rental[special_id]"]:checked', form),
				has_special = special.length ? true : false;
			
			if (prorated) {
				$.getJSON('/prorater', { rate: rate, move_date: calendar.val(), multiplier: (has_special ? special.attr('data-special-calc').split('|')[2] : 1) }, function(data) {
					update_totals(parseFloat(data.multiplier), rate, calendar, special, admin_fee, month_rate, tax_rate, tax_text, total_text, has_special, prorated, form);
				});
			} else { // fixed rate
				update_totals(1, rate, calendar, special, admin_fee, month_rate, tax_rate, tax_text, total_text, has_special, prorated, form);
			}
		});
		
		new GreyWizard(form.parents('#rent_steps'), rent_workflow).begin_workflow_on(0);
		
		sizes_select.change(function() {
			month_rate.text(sizes_select.children(':selected').attr('data-unit-price'));
			form.trigger('recalc');
		});
		
		set_size_select(sizes_select, unit_type);
		type_select.change(function() {
			set_size_select(sizes_select, $(this).val().toLowerCase());
		});
		
		$('input[name="rental[special_id]"]', form).click(function() {
			form.trigger('recalc');
		});
		
		$('.calendar_wrap', form).click(function() { $(this).find('input').focus(); });
	});
}