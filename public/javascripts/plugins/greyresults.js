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
			check = $('input.unit_size', this);
		
		check.attr('checked', !check.is(':checked'));
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
			ajax_loader = $.new_ajax_loader('after', $this).show(),
			ids 		= [];
		
		compares.each(function() {
			var context    = $(this).parents('.listing'),
				special_id = $('.special_txt', context).attr('data-special-id'),
				size_id    = $('ul.dnp input.unit_size:checked', context).val();
			
			ids.push(this.value +','+ size_id +','+ special_id);
		});
		
		this.href += ids.join('-');
		
		$.getJSON(this.href, function(response) {
			$.with_json(response, function(data) {
				var pop_up = $('<div id="pop_up">'+ data['html'] +'</div>').dialog(default_pop_up_options({ 
					title: 'Comparing '+ compares.length +' Facilities',
					width: 'auto',
					height: 'auto',
					modal: true
				}));
				
				$.setGmap(data.maps_data, 'compare_map');
			});
			
			$this.show().attr('href', orig_href);
			ajax_loader.hide();
		});
		
		return false;
	});
	
	$('.specializer', '.unit_detail').live('click', function() {
		var $this = $(this),
			specials = $('.more_specials', $this.parent());
	
		if ($this.text() == 'more') {
			$this.text('less');
			specials.addClass('show_specials').show().css({ 'top': '-'+ (specials.outerHeight() / 2) +'px', 'right': '-'+ (specials.outerWidth() + (specials.outerWidth() / 2)) +'px' });
		} else {
			$this.text('more');
			specials.hide().css('right', 0);
		}
		
		return false;
	});
	
	$('.special_txt', '.more_specials').live('click', function() {
		var $this = $(this),
			active_special = $('.special_txt.active', $this.parent().parent()),
			special_clone = active_special.clone().removeClass('active'),
			more = $this.parents('.more_specials').hide().css('right', 0);;
		
		active_special.replaceWith($this.clone().addClass('active'));
		$this.replaceWith(special_clone);
		$('.specializer', more.parent()).text('more');
	});

	/* AJAX pagination, load next page results in the same page */
	$('.more_results').live('click', function(){
		var $this 	 	 = $('.more_results'),
			this_form 	 = $this.parents('form'),
			results_wrap = $('#rslt-list-bg'),
			plus_sign 	 = $this.find('span > span').hide(),
			ajax_loader  = $('.ajax_loader', $this).show(),
			last_index   = parseInt($('.num_icon', '.listing:last').text()) + 1,
			page = $('input[name=page]', $this.parent()).eq(0).val();
		
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
					$('input[name=page]').val(parseInt(page) + 1);

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
					get_partial_and_do({ partial: 'views/partials/greyresults/reserve', model: 'Listing', id: listing_id, sub_model: 'Size', sub_id: size_id, show_size_ops: false }, function(response) {
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
						$('#rent_step1 form').rental_form();
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
	
	$('#narrow_results_form').submit(function() {
		var form = $(this).runValidation(), 
			results_page = $('#ajax_wrap_inner'),
			results_wrap = $('#results_wrap', results_page),
			results_head = $('.rslt-head-txt', results_wrap),
			loading_txt  = 'Looking for '+ $('#search_storage_type', form).val() +' within <span class="hlght-text">'+ 
						   $('input[name="search[within]"]:checked', form).val() +'</span> miles of <span class="hlght-text">'+ 
						   $('#search_query', form).val() +'</span> '+ $.ajax_loader_tag();
		
		$('#type-one-top-bar', results_wrap).fadeTo(500, .5);
		$('h2', results_head).removeClass('no_results').html(loading_txt);
		$('.txt_ldr', results_head).txt_loader();
		
		if (form.data('valid') && !form.data('loading')) {
			form.data('loading', true);
			
			$.getJSON(form.attr('action'), form.serialize(), function(response) {
				$.with_json(response, function(data) {
					results_page.replaceWith(data['results']);
					$.setGmap(data['maps_data']);
					$('a', '.rslt-features').tooltip({ predelay: 300 });
					select_first_size_option();
					// TODO: this doesnt cause the compare link to appear
					//$('input[name=compare]', '.listing').autoClickFew(3);
					
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
	
	$('form', '#rent_step1').rental_form();
	
	// when a review request is sent, the link in the email goes to the single listing page with this hash in the url:
	if (window.location.hash == '#write_review')
		get_review_pop_up({ sub_partial: 'comments/write_review', model: 'Listing', id: $('listing_id').val() });
	
	$('a', '#write_review').live('click', function() {
		var $this = $(this);
		$.new_ajax_loader('after', $this.parent()).show().fadeOutLater('fast', 3000);
		get_review_pop_up({ sub_partial: 'comments/write_review', model: 'Listing', id: $this.attr('data-listing_id') });
		return false;
	});
	
});

function get_review_pop_up(options) {
	get_pop_up_and_do({ title: 'Write a Review', width: 500, modal: true }, options, function(pop_up) {
		$('#comment_name', pop_up).focus();
		
		$('form', pop_up).submit(function() {
			var form = $(this).runValidation(),
				ajax_loader = $.new_ajax_loader('after', $('input[type=submit]', this));

			if (form.data('valid') && !form.data('sending')) {
				ajax_loader.show();
				form.data('sending', true);

				$.post(form.attr('action'), form.serialize(), function(response) {
					$.with_json(response, function(data) {
						pop_up.html('<div class="framed" style="text-align:center;">'+ data +'</div>');
					});

					ajax_loader.hide();
					form.data('sending', false);
				}, 'json');
			}
			
			return false;
		});
	});
}

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
	if (typeof(marker) != 'undefined') marker.setImage('http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld='+ marker.mIndex +'|FED747|333333');
}

function unhighlightMarker(id){
	var marker = typeof id == 'object' ? id : getMarkerById(id), def = typeof(marker) != 'undefined';
	if (def && marker.GmapState == 'selected') marker.setImage('http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld='+ marker.mIndex +'|FED747|333333');
	else if (def) marker.setImage('http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld='+ marker.mIndex +'|339933|FFFFFF');
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

		if ($this.attr('rel') != '' && !$.any(pre_loaded_size_icons, function() { if (this.src == $this.attr('rel')) return true; })) {
			var img = new Image();
			img.src = $this.attr('rel');
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
			selected = self.tagName.toLowerCase() == 'option' ? $this.attr('rel') : $('option:selected', self).attr('rel'),
			new_img = $('<img src="'+ selected +'" alt="" />'),
			size_details = capitalize(self.tagName.toLowerCase() == 'option' ? $this.attr('data-unit-type') : $('option:selected', self).attr('data-unit-type'));
		
		size_details += "&nbsp;"+ (self.tagName.toLowerCase() == 'option' ? $this.text() : $('option:selected', self).text());
		
		if ($size_img.attr('src') != selected) {
			$size_img.fadeOut(100, function(){
				$size_picker.html('').append(new_img).append('<p class="size_details">'+ size_details +'</p>');
				new_img.hide().fadeIn(120);
				$size_img = $('img', $size_picker);

				if (new_img.width() > 183) new_img.width(183);
			});
		}
	}
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
					wizard.form_data = $('#new_rental', wizard.workflow).serialize();
					$('.numeric_phone', wizard.workflow).formatPhoneNum();
					
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
					
					$('#processing_rental .flash', wizard.workflow).remove();
					wizard.form_data += '&'+ form.serialize();
					
					$.post(form.attr('action'), wizard.form_data, function(response) {
						$.with_json(response, function(data) {
							$('#rental_complete', wizard.workflow).show();
							$('#processing_rental', wizard.workflow).hide();
							
						}, function(data) { // uh oh, something failed
							$('#processing_rental', wizard.workflow).append('<div class="flash error">'+ data.join('<br />') +'</div>');
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
			
		} else {
			multiplier = limit;
			
			if (limit == 1 && has_special)
				multiplier += 1.00;
		}
		
		$('#rental_duration', form).val(limit);
		paid_through.text(end_date.getMonth() + 1 +'/'+ end_date.getDate() +'/'+ end_date.getFullYear()).special_txt_anim();
		return multiplier;
	}
	
	function special_calc(calc, subtotal, month_rate, multiplier) {
		if (typeof calc == 'undefined') return 0;
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
	
	function calc_special_discount(rate, limit) {
		var discount = 0.1;
		return (rate * discount).toFixed(2);
	}
	
	function update_totals(multiplier, rate, calendar, special, admin_fee, month_rate, tax_rate, tax_text, total_text, has_special, prorated, form) {
		var subtotal = rate,
			total 	 = subtotal,
			limit 	 = 1,
			discount = 0,
			tax_amt	 = 0;
			
		if (special.length) {
			var calc = special.attr('data-special-calc').split('|');
			limit = calc[2] || 1;
		}
		
		var multi2 = update_end_date(limit, calendar, multiplier, has_special, prorated, form),
			discount = special_calc(calc, rate * multi2, parseFloat(month_rate.eq(0).text()), multi2),
			special_discount = calc_special_discount(rate, limit);
		
		subtotal *= multi2;
		total = subtotal;
		total -= parseFloat(special_discount) + parseFloat(discount);
		
		if (!isNaN(admin_fee)) total += admin_fee;
		if (!isNaN(tax_rate))  tax_amt = total * tax_rate;
		
		total += tax_amt;
		
		$('.dur', form).text(multi2.toFixed(2));
		$('.subtotal span', form).text(subtotal.toFixed(2));
		$('.discount span span', form).text(discount);
		$('.special_discount span span', form).text(special_discount);
		tax_text.text(tax_amt.toFixed(2));
		total_text.text(total.toFixed(2)).special_txt_anim();
	}
	
	return this.each(function() {
		var form 		 = $(this),
			remove_special = $('.remove_special', form).hide(),
			prorated	 = (form.attr('data-pr') == '1' ? true : false),
			type_select  = $('select[name=unit_type]', form),
			unit_type 	 = type_select.val().toLowerCase(),
			sizes_select = $('select[name="rental[size_id]"]', form),
			month_rate   = $('.rental_rate', form),
			admin_fee 	 = parseFloat($('.admin_fee span span', form).text()),
			tax_rate 	 = parseFloat($('.tax', form).attr('data-tax')),
			tax_text	 = $('.tax span span', form),
			total_text	 = $('.total span span', form),
			calendar	 = $('#rental_move_in_date', form).datepicker({
				onSelect: function(date, ui) {
					form.trigger('recalc');
				}
			});
		
		form.bind('recalc', function() {
			var rate = parseFloat(month_rate.eq(0).text()),
				special = $('input[name="rental[special_id]"]:checked', form),
				has_special = special.length ? true : false;
			
			if (prorated) {
				$.getJSON('/prorater', { 'rate': rate, 'move_date': calendar.val(), 'multiplier': (has_special ? special.attr('data-special-calc').split('|')[2] : 1) }, function(data) {
					update_totals(parseFloat(data.multiplier), rate, calendar, special, admin_fee, month_rate, tax_rate, tax_text, total_text, has_special, prorated, form);
				});
			} else { // fixed rate
				update_totals(1, rate, calendar, special, admin_fee, month_rate, tax_rate, tax_text, total_text, has_special, prorated, form);
			}
		});
		
		new GreyWizard(form.parents('#rent_steps'), rent_workflow).begin_workflow_on(0);
		$.activateSizeSelect(form);
		$('.auto_next', '#new_tenant').autoNext();
		
		// pop up login form
		$('#already_member', '#new_tenant').click(function() {
			$.greyAlert('Sorry, this feature is not yet implemented.');
			return false;
		});
		
		if (sizes_select.is(':visible')) {
			sizes_select.change(function() {
				month_rate.text(sizes_select.children(':selected').attr('data-unit-price'));
				form.trigger('recalc');
			});
			set_size_select(sizes_select, unit_type);
			
			type_select.change(function() {
				set_size_select(sizes_select, $(this).val().toLowerCase());
			});
			
		} else form.trigger('recalc');

		
		$('input[name="rental[special_id]"]', form).click(function() {
			var $this = $(this);
			
			if ($this.is(':checked')) {
				remove_special.hide();
				$this.siblings('.remove_special').show();
			}
			
			form.trigger('recalc');
		});
		
		$('.calendar_wrap', form).click(function() { 
			$(this).find('input').focus(); 
		});
		
		remove_special.click(function() {
			$(this).hide().siblings('input').attr('checked', false);
			form.trigger('recalc');
			return false;
		});
	});
}