// Greyresults 
// Diego Salazar, Grey Robot, Inc. April, 2010
// functionality specific to the listings results of USSelfStorageLocator.com
// for both back end (client control panel) and front end (search results)

$(function(){	
	$('a', '#sl-tabs-nav').click(function() {
		window.location.hash = this.href.split('#')[1];
	});

	if ($.on_page([['profile, show', 'listings']])) {
		if (window.location.hash != '') {
			setTimeout(function() { // wait for tabular_content to attach the click handler to the tabs, then trigger it
				$('a[href="'+ window.location.hash +'"]', '#sl-tabs-nav').click();
			}, 1);
		}
	}
	
	/*
	 * BACK END, listing owner page methods
	 */
	
	var listings = $('.listing', '#client_listing_box');
	if (listings.length > 0) {
		listings.each(function() {
			$('.progressbar', this).progressbar({ value: parseInt($('.percent', this).text()) });
		});
	}
	
	$('a', '#address_sort').live('click', function() {
		var $this = $(this),
			listings = $('.listing', '#client_listing_box');
			
		$.sort_stuff($this, listings, '.inner', function(a, b) {
			var a1 = parseInt($('.rslt-contact p', a).text()),
				b1 = parseInt($('.rslt-contact p', b).text());

			return a1 > b1 ? (stuff_sort_inverse ? 1 : -1) : (stuff_sort_inverse ? -1 : 1);
		});
		
		return false;
	});
	
	$('form.size_form', '#unit_sizes').live('submit', function() {
		var form = $(this).runValidation(),
			ajax_loader = $('.ajax_loader', form);
		
		if (form.data('valid') && !form.data('saving')) {
			form.data('saving', true);
			ajax_loader.show();
			$('.cancel_link', form).hide();
			
			$.post(form.attr('action'), form.serialize(), function(response) {
				$.with_json(response, function(data) {
					var new_size = $(data);
					form.after(new_size);
					$('.sl-table', new_size).effect('highlight', 3000);
					
					if (form.attr('data-edit') == '1') form.remove();
				});
				
				form.data('valid', null);
				form.data('saving', false);
				ajax_loader.hide();
			});
		}
		
		return false;
	});
	
	$('.cancel_link', '.size_form').live('click', function() {
		$(this).parents('.size_form').fadeOutRemove();
		return false;
	});
	
	$('.edit_size', '.sl-table-wrap').live('click', function() {
		var $this = $(this),
			size = $this.parents('.sl-table-wrap'),
			ajax_loader = $('.ajax_loader', $this.parent().next()).show();
			delete_link = $('.delete_link', size).hide();
		
		get_partial_and_do({ partial: 'sizes/form', model: 'Listing', id: $('#listing_id').val(), sub_model: 'Size', sub_id: $this.attr('data-size-id') }, function(response) {
			$.with_json(response, function(partial) {
				var form = $(partial),
					price = $('#size_price', form);
				
				price.val((parseFloat(price.val()) / 100.0).toFixed(2)).focus();
				size.after(form);
				size.hide();
				
				$('#size_price', form).val(parseInt($('#size_price', form).val()))
				
				$('.cancel_link', form).click(function() {
					ajax_loader.hide();
					delete_link.show();
					form.hide();
					size.show();
					return false;
				});
			});
		});
		
		return false;
	});
	
	$('.delete_link', '.sl-table-wrap').live('click', function() {
		var $this = $(this),
			ajax_loader = $('.ajax_loader', $this.parent());
			
		$.greyConfirm('Are you sure you want to delete this unit size?', function() {
			$this.hide();
			ajax_loader.show();
			
			$.post($this.attr('href'), { _method: 'delete' }, function(response) {
				$.with_json(response, function(data) {
					$this.parents('.sl-table-wrap').fadeOutRemove();
				});
			});
		});
		
		return false;
	});
	
	$('.select_predefined_size', '#sl-tabs-predefined-sizes-in').live('click', function() {
		$(this).parents('.sl-table').click();
		return false;
	});
	
	$('.sl-table', '#sl-tabs-predefined-sizes-in').click(function() {
		var predef = $(this).parent(),
			predef_id = predef.attr('id').replace('PredefinedSize_', ''),
			ajax_loader = $('.ajax_loader', predef);
		
		if (!predef.data('adding')) {
			predef.data('adding', true);
			ajax_loader.show();
			
			$.post('/listings/'+ $('#listing_id').val() +'/add_predefined_size', { 'predef_id': predef_id }, function(response) {
				$.with_json(response, function(data) {
					var size = $(data);
					$('.uncollapse', '#sl-tabs-sizes-in').append(size);
					$('.sl-table', size).addClass('active').effect('highlight', 1500).find('#size_price').focus();
				});
				
				predef.data('adding', false);
				ajax_loader.hide();
			});
		}
	});
	
	$('#request_review_form').live('submit', function() {
		var form = $(this).runValidation(),
			ajax_loader = $('.ajax_loader', form);
		
		$('.success_msg', form).remove();
		
		if (form.data('valid') && !form.data('sending')) {
			form.data('saving', true);
			ajax_loader.show();
			
			$.post(form.attr('action'), form.serialize(), function(response) {
				$.with_json(response, function(data) {
					form[0].reset();
					// this refills the hint
					$('textarea', form).each(function() { $(this).focus().blur(); });
					ajax_loader.before("<p class='success_msg'>Your message was sent!</p>");
				});
				
				form.data('sending', false);
				ajax_loader.hide();
			});
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
	
	// Amenities and Specials
	$('.amenity input', '#tab3').button().click(function(){
		var $this = $(this), form = $this.parents('form.amenity'), 
			ajax_loader = $.new_ajax_loader('after', this).show();
		
		$.post(form.attr('action'), function(response) {
			$.with_json(response);
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
	
	$('.copy_all a').live('click', function() {
		var $this = $(this).fadeTo(600, .5);
			
		if (!$this.data('saving')) {
			$.greyConfirm('Are you sure you want to copy this to your other facilities?', function() {
				$this.data('saving', true);
				var ajax_loader = $.new_ajax_loader('after', $this).show().css({ 'float': 'left', 'margin': '0 10px' });

				$.post($this.attr('href'), function(response) {
					$.with_json(response, function(data) {
						$this.parent().after('<span class="success_msg" style="float:left;margin:0 10px">Saved!</span>');

						setTimeout(function() {
							$('.success_msg', $this.parent()).fadeOutRemove(1000);
						}, 2000);
					});

					$this.data('saving', false)
					$this.fadeTo(300, 1);
					ajax_loader.hide();
				}, 'json');
			});
		}
		
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
	
	$('li.enabled', 'li.rslt-price').live('click', function() {
		var $this = $(this),
			check = $('input.unit_size', $this.parent());
		
		check.attr('checked', true);
		$('li.enabled', $this.parent()).removeClass('selected');
		$this.addClass('selected');
	});
	
	$compare_btns = $('input[name=compare]', '.listing');
	$compare_btns.live('click', function(){
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
		var $this 		= $(this).hide(),
			orig_href 	= $this.attr('href'),
			compares 	= $('input:checked', '.compare'),
			ajax_loaders = [],
			ids 		= [];
		
		compares.each(function() {
			var context    = $(this).parents('.listing'),
				special_id = $('.special_txt', context).attr('data-special-id'),
				size_id    = $('ul.dnp input.unit_size:checked', context).val(),
				cmp_text   = $('.compare a', context).hide();
			
			ajax_loaders.push($.new_ajax_loader('after', cmp_text).show());
			ids.push(this.value +'x'+ size_id +'x'+ special_id);
		});
		
		this.href += ids.join('-');
		
		$.getJSON(this.href, function(response) {
			$.with_json(response, function(data) {
				var pop_up = $('<div id="pop_up">'+ data['html'] +'</div>').dialog(default_pop_up_options({ 
					title: 'Comparing '+ compares.length +' Facilities',
					width: 'auto',
					height: 'auto',
					modal: true
				})),
				ajax_loader = $('.ajax_loader', pop_up).show();
				
				$.calculatePrice(pop_up);
				$.setGmap(data.maps_data, 'compare_map');
			});
			
			$this.attr('href', orig_href);
			compares.each(function() { $('a', $(this).parent()).show() });
			$.each(ajax_loaders, function() { $(this).hide() });
		});
		
		return false;
	});
	
	// update the url of the rent it btns and recalculate price
	$('.special_txt').live('switched', function() {
		var spec_txt = $(this),
			ajax_loader = $.new_ajax_loader('html', $('#calcfor_'+ spec_txt.attr('data-listing-id'))).show(),
			btns = $('.calc_params', '#'+ spec_txt.attr('data-context'));
		
		btns.each(function() {
			var special_id = spec_txt.attr('data-special-id');
			this.href = this.href.replace(/\&special=\d+/, '&special='+ special_id);
			$(this).attr('data-special-id', special_id);
		});
		
		$.calculatePrice('#calc_params_for_'+ spec_txt.attr('data-listing-id'));
	});
	
	$('.specializer', '.specializer_wrap').live('click', function() {
		var $this = $(this),
			specials = $('.more_specials', $this.parent());
	
		if ($this.text() == 'more') {
			$this.text('less');
			specials.addClass('show_specials').show().css({ 'top': '-'+ specials.height() +'px', 'right': '-'+ (specials.outerWidth() / 2) +'px' });
		} else {
			$this.text('more');
			specials.hide().css('right', 0);
		}
		
		return false;
	});
	
	$('.special_txt', '.more_specials').live('click', function() {
		var $this = $(this),
			context = $this.parents('.specializer_wrap'),
			active_special = $('.special_txt.active', context),
			special_clone = active_special.clone().removeClass('active'),
			more = $this.parents('.more_specials').hide().css('right', 0);;
		
		active_special.replaceWith($this.clone().addClass('active'));
		$this.replaceWith(special_clone);
		$('.specializer', more.parent()).text('more');
		$('.special_txt.active', context).trigger('switched');
	});

	/* AJAX pagination, load next page results in the same page */
	$('.more_results').live('click', function(){
		var $this 	 	 = $('.more_results'),
			this_form 	 = $this.parents('form'),
			results_wrap = $('#rslt-list-bg'),
			plus_sign 	 = $this.find('span > span').hide(),
			ajax_loader  = $('.ajax_loader', $this).show(),
			last_index   = parseInt($('.num_icon', '.listing').filter(':last').text().replace(/^\s+|\s+$/g, '')) + 1,
			page 		 = parseInt($('input[name=page]', $this.parent()).eq(0).val());
		
		if (!this_form.data('submitting')) {
			this_form.data('submitting', true);
			
			$.getJSON(this_form.attr('action'), this_form.serialize(), function(response) {
				$.with_json(response, function(data) {
					var listings = data.listings;
					
					for (var i = 0, len = listings.length; i < len; i++) {
						var listing = $(listings[i]);
						$('.num_icon', listing).text(last_index + i);
						results_wrap.append(listing);
					}
					
					$.setGmap(data.maps_data, 'main_map', last_index-1);
					
					// this updates the page count so the next time the user clicks, we pull the correct data
					$('input[name=page]').val(page + 1);

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
	
	select_first_size_option();
	$.activateSizeSelect('#narrow_results_form');
	
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
	$('.reserve_btn', '.listing').live('click', function() {
		var $this = $(this), 
			new_href = $this.attr('href').replace('/sizes', ($this.hasClass('reserve_btn') ? '/reserve' : '/info_request')),
			context = $this.parents('.listing'),
			query_hash = $.queryToHash(this.href.split('?')[1]),
			size_id = $(':radio:checked', context).val();
		
		if (size_id) this.rel = 'reserve';
		
		query_hash.size_id = size_id;
		query_hash.special_id = $('.special_txt.active', context).attr('data-special-id');
		
		$this[0].href = $this[0].href.split('?')[0] +'?'+ $.hashToQuery(query_hash);
		
		return false;
	});
	
	$('.request_btn', '.listing').live('click', function() {
		var $this = $(this), 
			new_href = $this.attr('href').replace('/sizes', ($this.hasClass('reserve_btn') ? '/reserve' : '/info_request')),
			context = $this.parents('.inner'),
			unit_size = $(':radio:checked', context),
			special = $('.special_txt.active', context);

		if (unit_size.length) {
			var ar = (special.length == 1 ? '[0]' : ''); // make the sub_model param an array if a special is present
			$this.attr('href', new_href +'&sub_model'+ ar +'=Size&sub_id'+ ar +'='+ unit_size.val());
			$this.attr('rel', 'reserve'); // makes the panel open with the rental form instead of the sizes list
		}

		if (special.length == 1)
			$this[0].href += '&sub_model[1]=PredefinedSpecial&sub_id[1]=' + special.attr('data-special-id');
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
			
			if (this.rel == 'reserve') { // insert an iframe in the panel
				panelSwitchin($this, $listing, $panel);
				$panel.html('<iframe src="'+ $this.attr('href') +'" id="secure_frame"></iframe>');
				
			} else {
				$.getJSON(this.href, function(response) {
					$.with_json(response, function(data){
						panelSwitchin($this, $listing, $panel);
						$panel.html(data);
						
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

						} else if ($this.attr('rel') == 'request') {
							$.activate_datepicker($panel);
							$('.numeric_phone', $panel).formatPhoneNum();
						}
					});
				});
			}
			
		} else {
			$panel.slideUp();
			$('.tab_link, .listing, .panel').removeClass('active');
			$('li', '.tabs').removeClass('active');
		}
		
		function panelSwitchin(tab, listing, panel) {
			$('.tab_link, .listing, .panel').removeClass('active');
			$('li', '.tabs').removeClass('active');
			tab.addClass('active').parent().addClass('active');
			listing.addClass('active');
			panel.addClass('active');
			
			$('.listing:not(.active) .open_tab').text('+');
			$('.open_tab', listing).data('active', true).text('-');
			
			$('.progress', '.listing.active').removeClass('active').animate({ 'margin-top': '-16px' }, 'fast');
			$('.panel:not(.active)').slideUp();
			
			if (panel.is(':hidden'))
				panel.slideDown(900, function(){ if ($(window).height() < 650) $(window).scrollTo(listing, { speed: 1000 }); });
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
		map_container.parent().prepend('<img src="http://s3.amazonaws.com/storagelocator/images/ui/storagelocator/usselfstoragelocator-sml.png" class="dp" />');
		
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
	$('.open_reserve_form').live('click', function() {
		var $this 	   		= $(this), 
			rform 	   		= $('.reserve_form', $this.parent()),
			wrap 	   		= $this.parent('.sl-table-wrap'),
			listing_id 		= wrap.attr('data-listing-id').replace('listing_', ''),
			size_id    		= wrap.attr('id').replace('Size_', ''),
			renting_enabled = wrap.attr('data-renting-enabled') == 'true' ? true : false,
			ajax_loader 	= $.new_ajax_loader('before', $('.rsr-btn', this));
		
		console.log(wrap, wrap.attr('id'), size_id)
		
		if (rform.hasClass('active')) { // clicking on an open form, close it
			rform.slideUp().removeClass('active');
			$('.sl-table').removeClass('active');
			
		} else { // get or open the form for this size
			$('.reserve_form').slideUp().removeClass('active');
			$('.sl-table').removeClass('active');
			$('.sl-table', rform.parent()).addClass('active');
			
			if (unit_size_form_partials[size_id]) 
				rform.slideDown().addClass('active');
			else {
				ajax_loader.show();
				
				if (renting_enabled) { // we must get the rent form partial that contains the rent_steps
					var special = $('.special_txt.active', wrap.parents('#listing_'+ listing_id)),
						params = { partial: 'listings/rent_form', model: 'Listing', id: listing_id, show_size_ops: false };
						
					if (special.length == 1) {
						params.sub_model = { '1': 'Size', '2': 'PredefinedSpecial' };
						params.sub_id = { '1': size_id, '2': special.attr('data-special-id') };
					} else {
						params.sub_model = 'Size';
						params.sub_id = size_id;
					}
					console.log(params)
					get_partial_and_do(params, function(response) {
						unit_size_form_partials[size_id] = response.data;
						rform.html(response.data).slideDown().addClass('active');
						$('#rent_step1 form', rform).rental_form();
						ajax_loader.hide();
					});
				} else {
					get_partial_and_do({ partial: 'views/partials/greyresults/request_info', model: 'Listing', id: listing_id, sub_model: 'Size', sub_id: size_id }, function(response) {
						unit_size_form_partials[size_id] = response.data;
						rform.html(response.data).slideDown().addClass('active');
						$('#rent_step1 form').rental_form();
						ajax_loader.hide();
					});
				}
			}
		}

		$('input[type=text]:first', rform).focus();
		return false;
	});
	
	// Info request: submit reserver details
	$('form.new_listing_request').live('submit', function() {
		var form = $(this).runValidation(),
			ajax_loader = $('.ajax_loader', form).show();
		
		if (form.data('valid') && !form.data('saving')) {
			form.data('saving', true);
			$('.flash', form).slideUpRemove('slow');
			
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
	
	var feature_toggle = $('.openDiv', '#unit_features');
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
	
	function select_first_size_option() {
		$('li.rslt-price').each(function() {
			var option = $('.enabled:first', this);
			option.addClass('selected');
			$('input', option).attr('checked', true);
		});
	}
	
	$.enableTooltips('a', '.rslt-features');
	
	$('#narrow_results_form').submit(function() {
		var results_page = $('#ajax_wrap_inner'),
			results_wrap = $('#results_wrap', results_page),
			results_head = $('.rslt-head-txt', results_wrap),
			loading_txt  = 'Looking for '+ $('#search_storage_type', this).val() +' within <span class="hlght-text">'+ 
						   $('input[name="search[within]"]:checked', this).val() +'</span> miles of <span class="hlght-text">'+ 
						   $('#search_query', this).val() +'</span> '+ $.ajax_loader_tag();
		
		$('#type-one-top-bar', results_wrap).fadeTo(500, .5);
		$('h2', results_head).removeClass('no_results hide').html(loading_txt);
		$('.txt_ldr', results_head).txt_loader();
		
		$.safeSubmit(this, {
			ajax_loader: false,
			success: function(data) {
				results_page.replaceWith(data.results);
				$.setGmap(data.maps_data);
				$.enableTooltips('a', '.rslt-features');
				select_first_size_option();
				// TODO: this doesnt cause the compare link to appear
				//$('input[name=compare]', '.listing').autoClickFew(3);
				
				$('.rslt-price', '.listing').each(function(){
					$(':radio', this).eq(0).attr('checked', true);
					$('.radio_select', this).eq(0).addClass('checked');
				});
				
				$('body').attr('id', 'listings_controller').addClass('locator_action'); // this is only needed cuz the layout is kinda fucked up and not consistent across pages
			}
		});
		
		return false;
	});
	
	$('.list_sort').live('click', function() {
		var $this = $(this), form = $('#narrow_results_form', '#content_bottom'),
			sort_fields = $('input.sort_field', form);
		
		if (!sort_fields.length) {
			sort_fields = '<div><input type="hidden" name="search[sorted_by]" class="sort_field" value="'+ $this.attr('data-sorted_by') +'" />' +
						  '<input type="hidden" name="search[sort_reverse]" class="sort_field" value="'+ $this.attr('data-sort_reverse') +'" /></div>';
			
			form.append(sort_fields);
		} else {
			sort_fields.filter('input[name="search[sort_reverse]"]').val($this.attr('data-sort_reverse'));
			sort_fields.filter('input[name="search[sorted_by]"]').val($this.attr('data-sorted_by'));
		}
		
		form.submit();
		return false;
	});
	
	var main_map = $('#main_map', '#content');
	if (main_map.length) {
		if (typeof Gmaps_data == 'undefined') {
			var latlng = main_map.attr('data-latlng').split(',');
			$.setGmap({ center: { lat: parseFloat(latlng[0]), lng: parseFloat(latlng[1]), zoom: 14 }, maps: [] });
			$('#narrow_results_form').submit();
			
		} else $.setGmap({ center: Gmaps_data.center, maps: Gmaps_data.maps });
	}
	
	var featured_listing = $('#feat_wrap');
	if (featured_listing.length > 0 && featured_listing.children().length == 0 && $.on_page([['locator, home, show', 'listings, pages']])) {
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
	
	$('#rentalizer').rental_form();
	
	// when a review request is sent, the link in the email goes to the single listing page with this hash in the url:
	if (window.location.hash == '#write_review')
		get_review_pop_up({ sub_partial: 'comments/write_review', model: 'Listing', id: $('listing_id').val() });
	
	$('a', '#write_review').live('click', function() {
		var $this = $(this);
		$.new_ajax_loader('after', $this.parent()).show().fadeOutLater('fast', 3000);
		get_review_pop_up({ sub_partial: 'comments/write_review', model: 'Listing', id: $this.attr('data-listing_id') });
		return false;
	});
	
	$('#toggle_renting', '#sl-edit-tabs').click(function() {
		var $this = $(this),
			ajax_loader = $.new_ajax_loader('after', this),
			toggle = $this.attr('data-toggle') == 'true',
			toggle_html = $this.attr('data-toggle') == 'true' ? $('#toggle_renting_html', '#tab2').html() : 'Are you sure you want to disable renting?';
		
		$.greyConfirm(toggle_html, function() {
			if (!$this.data('sending')) {
				$this.data('sending', true);
				ajax_loader.show();

				$.post($this.attr('href'), function(response) {
					$.with_json(response, function(data) {
						$this.text((toggle ? 'Disable' : 'Enable') +' Renting').attr({ 'href': data.href, 'data-toggle': (toggle ? 'false' : 'true') });
						
						if (toggle) 
							$('#listing_extra_form', '#tab2').slideDown('slow', function() { $(this).removeClass('hide').addClass('enabled') });
						else
							$('#listing_extra_form', '#tab2').slideUp('slow', function() { $(this).removeClass('enabled').addClass('hide') });;
					});

					ajax_loader.hide();
					$this.data('sending', false)
				}, 'json');
			}
		});
		
		return false;
	});
	
	$('#select_all', '#searcher_step2').live('click', function() {
		var $this = $(this);
		$('.listing_div', $this.parent()).click();
		$this.text($this.text() == 'Select All' ? 'Clear All' : 'Select All');
		
		return false;
	});
	
});

function get_review_pop_up(options) {
	get_pop_up_and_do({ title: 'Write a Review', width: 500, modal: true }, options, function(pop_up) {
		$('#comment_name', pop_up).focus();
		
		$('form', pop_up).submit(function() {
			$.safeSubmit(this, {
				al_where: 'after',
				success: function(data) {
					pop_up.html('<div class="framed" style="text-align:center;">'+ data +'</div>');
				}
			});
			
			return false;
		});
	});
}

/*
 * Google Map methods
 */
var MapIconMaker = {};
MapIconMaker.createMarkerIcon = function(opts) {
	var width 		 = opts.width || 32,
		height 		 = opts.height || 32,
		primaryColor = opts.primaryColor || "#ff0000",
		strokeColor  = opts.strokeColor || "#000000",
		cornerColor  = opts.cornerColor || "#ffffff",
		baseUrl 	 = "http://chart.apis.google.com/chart?cht=mm",
		iconUrl 	 = baseUrl + "&chs=" + width + "x" + height + "&chco=" + cornerColor.replace("#", "") + "," + primaryColor.replace("#", "") + "," + strokeColor.replace("#", "") + "&ext=.png",
		icon 		 = new GIcon(G_DEFAULT_ICON);
	
	icon.image 			  = iconUrl;
	icon.iconSize 		  = new GSize(width, height);
	icon.shadowSize 	  = new GSize(Math.floor(width*1.6), height);
	icon.iconAnchor 	  = new GPoint(width/2, height);
	icon.infoWindowAnchor = new GPoint(width/2, Math.floor(height/12));
	icon.printImage 	  = iconUrl + "&chof=gif";
	icon.mozPrintImage    = iconUrl + "&chf=bg,s,ECECD8" + "&chof=gif";
	
	var iconUrl = baseUrl + "&chs=" + width + "x" + height + "&chco=" + cornerColor.replace("#", "") + "," + primaryColor.replace("#", "") + "," + strokeColor.replace("#", "");
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
	
	for (var i = 0; i < icon.imageMap.length; i++)
		icon.imageMap[i] = parseInt(icon.imageMap[i]);

	return icon;
}

try {
	// size of /images/ui/storagelocator/result-number.png
	G_DEFAULT_ICON.iconSize.width = 29;
	G_DEFAULT_ICON.iconSize.height = 39;
	
	var iconOptions = {};
	iconOptions.width = 29;
	iconOptions.height = 39;
	iconOptions.primaryColor = "#0000ff";
	iconOptions.cornerColor = "#FFFFFF";
	iconOptions.strokeColor = "#000000";
	var normalIcon = MapIconMaker.createMarkerIcon(iconOptions);

	// http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=A|00CC99|000000
	var startIcon = new GIcon(G_DEFAULT_ICON, 'http://s3.amazonaws.com/storagelocator/images/ui/map_marker.png'); // the 'you are here' icon
	
	//save the regular icon image url
	var normalIconImage    = normalIcon.image,
		highlightIconImage = 'http://chart.apis.google.com/chart?cht=mm&chs=32x32&chco=FFFFFF,FBD745,000000&ext=.png',
		selectedIconImage  = 'http://chart.apis.google.com/chart?cht=mm&chs=32x32&chco=FFFFFF,FB9517,000000&ext=.png';
} catch (e){}

function highlightMarker(id){
	var marker = typeof id == 'object' ? id : getMarkerById(id);
	if (typeof(marker) != 'undefined') marker.setImage('http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld='+ marker.mIndex +'|FED747|333333'); //marker.setImage(make_indexed_icon(marker.mIndex)); //
}

function unhighlightMarker(id){
	var marker = typeof id == 'object' ? id : getMarkerById(id), def = typeof(marker) != 'undefined';
	if (def && marker.GmapState == 'selected') marker.setImage('http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld='+ marker.mIndex +'|FED747|333333');
	else if (def) marker.setImage(get_marker_img_path(marker.mIndex)); //marker.setImage('http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld='+ marker.mIndex +'|339933|FFFFFF');
}

function getMarkerById(id) {
	var marker;

	$.each(GmapMarkers, function(){
		if (this.listing_id == id) {
			marker = this; return;
		}
	});

	return marker;
}

function addMarker(map, icon, lat, lng, title, body, bind_mouse_overs) {
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

	map.addOverlay(marker);
	return marker;
}

function make_indexed_icon(index) {
	//var img_path = 'http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld='+ index +'|339933|FFFFFF';
	var icon = new GIcon(G_DEFAULT_ICON, get_marker_img_path(index));
	return icon;
}

function get_marker_img_path(n) { // see app/metal/marker_maker.rb for more query params
	var p;
	if 		(n < 10)  p = '/marker_maker?n='+ n +'&color=white&font_weight=bold&shadow=1&font_size=14&offset=10x3';
	else if (n < 100) p = '/marker_maker?n='+ n +'&color=white&font_weight=bold&shadow=1&font_size=14&offset=5x3';
	else			  p = '/marker_maker?n='+ n +'&color=white&font_weight=bold&shadow=1&font_size=11&offset=5x5';
	return p;
}

GmapMarkers = [];
$.setGmapMarkers = function(map, markers, page, resetMarkers) {
	if (typeof resetMarkers == 'undefined') resetMarkers = false;
	if (resetMarkers) {
		$.each(GmapMarkers, function() { map.removeOverlay(this) });
		GmapMarkers = [];
	}
	
	for (var i = 0, len = markers.length; i < len; i++) {
		var photo = markers[i].thumb,
			title = markers[i].title.replaceAll('+', ' '),
			body = '<p>'+ photo + 
						'<span class="listing_title"><a href="/self-storage/show/'+ markers[i].id +'">'+ title +'</a></span>'+ 
						'<span class="listing_address">'+ markers[i].address.replaceAll('+', ' ') +'<br/>'+ markers[i].city.replaceAll('+', ' ') +', '+ markers[i].state +' '+ markers[i].zip +'</span>'+
					'</p>',
			paged_index = page + i + 1;
		
		var marker = addMarker(Gmap, make_indexed_icon(paged_index), markers[i].lat, markers[i].lng, title, body);
		marker.mIndex = paged_index;
		marker.listing_id = markers[i].id;

		GmapMarkers[page + i] = marker;
	}
}

$.setGmap = function(data, el, page) {
	if (typeof el == 'undefined') el = 'main_map';
	if (typeof page == 'undefined') page = 0;
	
	Gmap = new GMap2(document.getElementById(el));
	Gmap.addControl(new GLargeMapControl());
	Gmap.addControl(new GScaleControl());
	Gmap.addControl(new GMapTypeControl());
	Gmap.setCenter(new GLatLng(data.center.lat, data.center.lng), (data.center.zoom || 16));
	Gmap.enableDoubleClickZoom();
	Gmap.disableContinuousZoom();
	Gmap.disableScrollWheelZoom();

	addMarker(Gmap, startIcon, parseFloat(data.center.lat), parseFloat(data.center.lng), 'Origin', '<p><strong>Search distance measured from here.</strong></p>', false);
	$.setGmapMarkers(Gmap, data.maps, page, true);

	//bind mouseover result row to highlight map marker
	$('.listing', '#rslt-list-bg').live('mouseenter', function(){
		var id = $(this).attr('id').split('_')[1];
		highlightMarker(id);
	});
	
	$('.listing', '#rslt-list-bg').live('mouseleave', function(){
		var id = $(this).attr('id').split('_')[1];
		unhighlightMarker(id);
	});
	
	//do some nifty researching as the map drags
	GEvent.addListener(Gmap, "dragend", function() {
		var coords = Gmap.getCenter();
		
		$.getJSON('/self-storage', { auto_search: 1, lat: coords.lat(), lng: coords.lng(), within: $('input:checked', '#distance_btns').eq(0).val(), strict_order: true }, function(response) {
			$.with_json(response, function(data) {
				$('#results_wrap', '#content').replaceWith($(data.results).find('#results_wrap'));
				$('#search_query', '#narrow-box').val(data.query);
				
				addMarker(Gmap, startIcon, parseFloat(data.maps_data.center.lat), parseFloat(data.maps_data.center.lng), 'Origin', '<p><strong>Search distance measured from here.</strong></p>', false);
				$.setGmapMarkers(Gmap, data.maps_data.maps, page, true);
			});
		});
	});

} // END setGmap()


// updates the info tab count in the listings edit page. the tab text is: <label> (<count>)
function update_info_tab_count(label, i) {
	var	tab = $('#tab_'+ label, '#sl-tabs'),
		count = parseInt(tab.text().split('(')[1].replace(')', '')) + i;
	
	tab.text(label.replace('_', ' ') + ' ('+ count +')');
}

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

$.activateSizeSelect = function(context) {
	var $size_picker = $('.size_picker', context),
		$size_img = $('img', $size_picker),
		$size_select = $('.sizes_select', context);

	// preload
	var pre_loaded_size_icons = [];
	$('option', $size_select).each(function(){
		var $this = $(this);

		if ($this.attr('data-url') != '' && !$.any(pre_loaded_size_icons, function() { if (this.src == $this.attr('data-url')) return true; })) {
			var img = new Image();
			img.src = $this.attr('data-url');
			pre_loaded_size_icons.push(img);
		}
	});

	if ($size_select.length) {
		size_icon_change($size_select); // update on page load
		$size_select.live('change', size_icon_change);
		$('option', $size_select).live('mouseover', size_icon_change);
	}

	function size_icon_change(input) {
		var self = input[0] || this,
			$this = $(self),
			selected = self.tagName.toLowerCase() == 'option' ? $this.attr('data-url') : $('option:selected', self).attr('data-url'),
			new_img = $('<img src="'+ selected +'" alt="" />'),
			size_details = capitalize(self.tagName.toLowerCase() == 'option' ? $this.attr('data-unit-type') : $('option:selected', self).attr('data-unit-type'));
		
		size_details += "&nbsp;"+ (self.tagName.toLowerCase() == 'option' ? $this.text() : $('option:selected', self).text());
		
		if ($size_img.attr('src') != selected) {
			$size_img.fadeOut(100, function() {
				$size_picker.html('').append(new_img).append('<p class="size_details">'+ size_details +'</p>');
				new_img.hide().fadeIn(120);
				$size_img = $('img', $size_picker);

				if (new_img.width() > 183) new_img.width(183);
			});
		}
	}
}

$.enableTooltips = function(el, context, delay) {
	$(el, context).tooltip({ predelay: (delay || 300) });
}

$.calculatePrice = function(context) {
	$.getJSON('/rentalizer', $.getCalculationParams(context), function(response) {
		$.with_json(response, function(data) {
			$.each(data, function() {
				var calc_wrap = $('#calcfor_'+ this.listing_id), html = '',
					paid_thru = new Date(this.calculation.paid_thru),
					months = paid_thru.getMonth() - new Date().getMonth();
				
				html += '<span class="price">$'+ this.calculation.total +'</span><br />';
				html += '<span class="date">Paid for '+ months +' month'+ (months > 1 ? 's' : '') +'<br />thru '+ paid_thru.format('longDate') +'</span>';
				
				calc_wrap.html(html);
			});
		});
	});
}

$.getCalculationParams = function(context) {
	var btns = $('.calc_params', context), params = { multi_params: [] }, now = new Date();
	
	btns.each(function(i) {
		var b = $(this), 
			p = [b.attr('data-listing-id'), b.attr('data-size-id'), b.attr('data-special-id')];
			
		params.multi_params.push(p.join('x'));
	});
	
	params.multi_params = params.multi_params.join('-');
	params.move_in_date = new Date(now.getYear(), now.getMonth(), now.getDate() + 1).format('isoDate');
	
	return params;
}

$.fn.special_txt_anim = function() {
	return this.each(function() {
		$(this).animate({ 'font-size': '120%' }, 150, function() { 
			$(this).animate({ 'font-size': '100%' }, 300);
		});
	});
}

// first used for the compare checkboxes
$.fn.autoClickFew = function(max) {
	if (typeof max == 'undefined') var max = 2;
	return this.each(function(i) {
		if (i <= max) $(this).click();
	});
}

// make an auto updating form, when values change, update the total
$.fn.rental_form = function() {
	var rent_workflow = {
		slides : [
			{
				div_id  : 'rent_step1',
				nav_vis : [
					['next', function(btn, wizard) { btn.text('Next').fadeIn() }],
					['back', 'fadeOut'] 
				]
			}, // END slide 1
			{
				div_id  : 'rent_step2',
				nav_vis : [
					['next', function(btn, wizard) { btn.text('Rent It!').fadeIn() }],
					['back', 'fadeIn']
				],
				action : function(wizard) {
					wizard.form_data = $('#rentalizer', wizard.workflow).serialize();
					
					$('.numeric_phone', wizard.workflow).formatPhoneNum();
					$('#siteseal', '#rent_steps').animate({ right: '240px' }, 'fast');
					
					$('#new_tenant', wizard.workflow).unbind('submit').submit(function() {
						wizard.next();
						return false;
					});
				},
				validate : function(wizard) {
					return $('#new_tenant', wizard.workflow).runValidation().data('valid');
				}
			},
			{
				div_id  : 'rent_step3',
				nav_vis : [
					['next', 'fadeOut'],
					['back', 'fadeOut']
				],
				action : function(wizard) {
					var form = $('#new_tenant', wizard.workflow),
						ajax_loader = $('#processing_rental .ajax_loader', wizard.workflow).show();
					
					$('#siteseal', '#rent_steps').animate({ right: '20px' }, 'slow');
					$('#processing_rental .flash', wizard.workflow).remove();
					wizard.form_data += '&'+ form.serialize();
					
					$.post(form.attr('action'), wizard.form_data, function(response) {
						$.with_json(response, function(data) {
							var rent_conf = $('#rental_complete', wizard.workflow).show();
							$('#processing_rental', wizard.workflow).hide();
							
							for (key in data)
								if (data[key].length > 0)
									$('#'+ key, rent_conf).text(data[key]).parents('p').show();
							
						}, function(data) { // uh oh, something failed
							$('#processing_rental', wizard.workflow).html('<div class="flash error">'+ data.join('<br />') +'</div>');
							$('.back', wizard.nav_bar).show();
						});
						
						ajax_loader.hide();
					});
				}
			}, // END slide 1
		],
		finish_action : function(wizard) {
			wizard.workflow.parents('.panel').slideUp().removeClass('active').parents('.active').removeClass('active');
		}
	};

	function set_size_select(selects, unit_type, context) {
		selects.hide().attr('disabled', true).removeClass('active');
		selects.filter('#size_id_'+ unit_type, context).show().attr('disabled', false).addClass('active');
	}
	
	return this.each(function() {
		var form 		   = $(this),
			special_btns   = $('.avail_specials input', form),
			remove_special = $('.remove_special', form).hide(),
			type_select    = $('select[name=unit_type]', form),
			unit_type 	   = type_select.val().toLowerCase().replaceAll(' ', '_').replaceAll('-', '_').toLowerCase(),
			sizes_select   = $('select.sizes_select', form),
			calendar	   = $('#move_in_date', form).datepicker({
				onSelect: function(date, ui) { form.submit() },
				minDate: new Date(),
				maxDate: '+2w'
			}),
			inputs = {
				subtotal   : $('.subtotal', form),
				multiplier : $('.multiplier', form),
				month_rate : $('.month_rate', form),
				paid_thru  : $('.paid_thru', form),
				discount   : $('.discount' ,form),
				usssl_discount : $('.usssl_discount' ,form),
				admin_fee  : $('.admin_fee ', form),
				tax_amt    : $('.tax_amt', form),
				total	   : $('.total', form)
			};
		
		form.submit(function() {
			$.getJSON(form.attr('action'), form.serialize(), function(response) {
				$.with_json(response, function(data) {
					for (key in data) {
						inputs[key].each(function() {
							if (this.tagName.toLowerCase() == 'input')
								$(this).val(data[key]);
							else
								$(this).text(data[key]); 
						});
					}
				});
			});
			return false;
		});
		
		new GreyWizard(form.parents('#rent_steps'), rent_workflow).begin_workflow_on(0);
		$.activateSizeSelect(form);
		$('.auto_next', '#new_tenant').autoNext();
		
		// pop up login form
		$('#already_member', '#new_tenant').click(function() {
			$.greyAlert('Sorry, this feature is not yet implemented.');
			return false;
		});
		
		if (!$('#size_ops', form).hasClass('hide')) {
			sizes_select.change(function() {
				inputs.month_rate.text(sizes_select.children(':selected').attr('data-unit-price'));
				form.submit();
			});
			set_size_select(sizes_select, unit_type, form);
			
			type_select.change(function() {
				set_size_select(sizes_select, $(this).val().replaceAll(' ', '_').replaceAll('-', '_').toLowerCase(), form);
				sizes_select.filter('.active').change();
			});
		}
		
		special_btns.click(function() {
			var $this = $(this);
			
			if ($this.is(':checked')) {
				remove_special.hide();
				$this.siblings('.remove_special').show();
			}
			
			form.submit();
		});
		
		$('.calendar_wrap', form).click(function() { 
			$(this).find('input').focus(); 
		});
		
		remove_special.click(function() {
			$(this).hide().siblings('input').attr('checked', false);
			form.submit();
			return false;
		});
		
		setTimeout(function() {
			if ((s = special_btns.filter('.chosen')).length > 0)
				s.attr('checked', true).click();
			else
				special_btns.eq(0).attr('checked', true).click();
		}, 100);
	});
}