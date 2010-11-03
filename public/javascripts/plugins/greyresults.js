// Greyresults 
// Diego Salazar, Grey Robot, Inc. April, 2010
// functionality specific to the listings results of USSelfStorageLocator.com
// for both back end (client control panel) and front end (search results)

$(function(){
	/*
	 * BACK END, listing owner page methods
	 */
	// we needed to adjust the style of the sizes li to stop the inputs within from breaking to a new line, we save the original css here to revert later
	var sizes_li_adjustment = { 'margin-left': '13px', 'width': '84px' },
		sizes_li_revertment = { 'margin-left': '25px', 'width': '72px' };
	
	$.convert_unit_size_row_values_to_inputs = function(container, cancel_btn, delete_btn) {
		// values and such
		container.addClass('active');
		
		var sizes_li	= $('.st-size', container),
			type_li 	= $('.st-type', container),
			desc_li 	= $('.st-desc', container),
			price_li 	= $('.st-pric', container),
			specials_li = $('.st-spec', container),
			load_li		= $('.st-sele', container),
			// to revert the content on cancel
			sizes_orig		= sizes_li.text(),
			type_orig		= type_li.text(),
			desc_orig		= desc_li.text(),
			price_orig		= price_li.html(),
			specials_orig  	= specials_li.html(),
			// build the input fields with the original values preset
			x = sizes_orig.split(/\W?x\W?/)[0],
			y = sizes_orig.split(/\W?x\W?/)[1],
			xi = '<input type="text" size="3" maxlength="3" class="small_num i" name="size[width]" value="'+ x +'" />',
			yi = '<input type="text" size="3" maxlength="3" class="small_num i" name="size[length]" value="'+ y +'" />',
			ti = '<select class="i" name="size[title]">';
				$.each($('#unit_type_labels').text().split(','), function() {
					ti += '<option value="'+ this +'"'+ (type_orig == this ? ' selected="selected"' : '') +'>'+ this +'</option>';
				})
				ti +='</select>',
			
			di = '<input type="text" class="small_text_field i" name="size[description]" value="'+ desc_orig +'" />',
			pi = '<input type="text" size="8" maxlength="8" class="small_text_field i" name="size[price]" value="'+ price_orig.replace('$', '') +'" />',
			si = '<input type="text" class="small_text_field i" name="size[special]" value="'+ (specials_orig == 'NONE' ? '' : specials_orig) +'" />';
		
		// replace the content in the unit size row
		sizes_li.css(sizes_li_adjustment).html(xi +' x '+ yi);
		type_li.html(ti);
		desc_li.html(di);
		price_li.html('<span class="left">$ </span>'+ pi);
		specials_li.html(si);
		
		cancel_btn.show().click(function(){
			switch (cancel_btn.attr('rel')) {
				case 'close':
					container.fadeOut(300, function() { $(this).remove(); update_info_tab_count('Unit_Sizes', -1); });
				break;
				case 'cancel':
					// revert to original content
					sizes_li.html(sizes_orig).css(sizes_li_revertment);
					type_li.html(type_orig);
					price_li.html(price_orig);
					specials_li.html(specials_orig);

					$('.edit-btn', container).text('Edit');
					cancel_btn.hide();
					delete_btn.hide();
				break;
			}
			
			container.removeClass('active');
			return false;
		});
		
		delete_btn.show().click(function(){
			if (!delete_btn.data('deleting')) {
				delete_btn.data('deleting', true);
				
				var listing_id = $('input[name=listing_id]').val(),
					size_id = $('input[name=size_id]', container).val();

				$.greyConfirm('Are you sure you want to delete this unit size?', function() {
					$.post('/listings/'+ listing_id +'/sizes/'+ size_id, { _method: 'delete' }, function(response) {
						$.with_json(response, function(data) {
							container.fadeOut(300, function() {
								$(this).remove();
								update_info_tab_count('Unit_Sizes', -1);
							});
						});
						
						delete_btn.data('deleting', false);
					}, 'json');
				}, function() { cancel_btn.click() });
			}
			
			return false;
		});
	}

	$.clone_and_attach_inputs = function(inputs, context, form) {
		$(inputs, context).each(function(){ form.append($(this).clone()); });
	}

	$.post_new_unit_size_values_and_revert = function(container, hidden_form, cancel_btn, delete_btn) {
		var sizes_li	= $('.st-size', container),
			type_li 	= $('.st-type', container),
			price_li 	= $('.st-pric', container),
			specials_li = $('.st-spec', container);

		$.clone_and_attach_inputs('.i', container, hidden_form);
		cancel_btn.hide();
		delete_btn.hide();
		
		$.post(hidden_form.attr('action'), hidden_form.serialize(), function(response){
			$.with_json(response, function(data){
				// update the row with the new values
				var sizes_html = $('input[name="size[width]"]', container).val() +' x '+ $('input[name="size[length]"]', container).val();
				sizes_li.css(sizes_li_revertment).html(sizes_html);

				var type_html = $('select[name="size[title]"]', container).val();
				type_li.html(type_html);

				var price_html = $('input[name="size[price]"]', container).val();
				price_li.html('$'+ parseFloat(price_html).toFixed(2));

				var specials_html = $('input[name="size[special]"]', container).val();
				specials_li.html(specials_html);

				$('.edit-btn', container).text('Edit');
				cancel_btn.attr('rel', 'cancel');
				
				container.replaceWith($(data));
				
			}, function(data) { // error
				cancel_btn.show();
				delete_btn.show();
				
				$.ajax_error(data); 
			});
			
			$('.st-sele', container).removeClass('active_load');
			container.removeClass('active');
			
		}, 'json');
	}
	
	$('#new_unit', '#sl-tabs-sizes').live('click', function(){
		var unit_clone = $('.sl-table-wrap:not(.active)', '#sl-tabs-sizes-in').eq(0).clone().hide(),
			ajax_loader = $('.ajax_loader', $(this).parent()).show();
		
		if (!unit_clone.length) {
			$.getJSON('/ajax/get_partial?partial=sizes/size&pretend_action=new&model=Size&sub_model=Listing&sub_id='+ $('input[name=listing_id]').val(), function(response) {
				$.with_json(response, function(data) {
					unit_clone = $(data).appendTo('#sl-tabs-sizes-in');
					prep_unit_size_edit(unit_clone, ajax_loader);
				});
			});
			
		} else {
			$('.sl-table-head', '#sl-tabs-sizes-in').eq(0).after(unit_clone);
			prep_unit_size_edit(unit_clone, ajax_loader);
		}
		
		return false;
	});
	
	function prep_unit_size_edit(unit_size, ajax_loader) {
		var hidden_form = $('form:hidden', unit_size),
			cancel_btn = $('.cancel_link', unit_size);
		
		hidden_form.find('input[name=_method]').val('post').end();
		unit_size.fadeIn();
		
		$.convert_unit_size_row_values_to_inputs(unit_size, cancel_btn, $('.delete_link', unit_size));
		
		$('.edit-btn', unit_size).text('Save');
		cancel_btn.attr('rel', 'close');
		$('.delete_link', unit_size).remove();
		$('input[name=size_id]', unit_size).val('').attr('id', '');
		
		// change form attr to reroute the ajax call to the create action
		hidden_form.attr('action', hidden_form.attr('action').replace(/(sizes\/\d+)/, 'sizes'));
		hidden_form.find('input[name=_method]').val('post');
		
		$('input', unit_size).eq(0).focus();
		ajax_loader.hide();
		
		update_info_tab_count('Unit_Sizes', 1);
	}
	
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
	
	$('#XXXnarrow_results_form').submit(function(){
		var form = $(this),
			results = $('#rslt-list-bg').addClass('loading').children().hide();
		
		$.getJSON(form.attr('action'), form.serialize(), function(response) {
			$.with_json(response, function(data) {
				results.replaceWith(data);
			});
		});
		
		return false;
	});
	
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
	
	$('.rslt-price', '.listing').each(function(){
		$(':radio', this).eq(0).attr('checked', true);
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
	
	$('a', '.compare').live('click', function() {
		var compares = $('input:checked', '.compare'), compare_href = '';
		if (compares.length) {
			compares.each(function(){
				compare_href += this.value + ',';
			});
			
			this.href += compare_href;
		} else return false;
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
						var $map_wrap = $('.map_wrap', $panel);
						$map_wrap.append('<iframe />');
						$('iframe', $map_wrap).src('/ajax/get_map_frame?model=Listing&id='+ $listing.attr('id').split('_')[1]);
						$('.hintable', $panel).hinty();

					} else if ($this.attr('rel') == 'reserve') {
						$.activate_datepicker($panel);
						$('.numeric_phone', $panel).formatPhoneNum();
						new GreyWizard($('#reserve_steps', $panel), reservation_workflow).begin_workflow_on(0);
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
						$.activate_datepicker(rform);
						$('.numeric_phone', rform).formatPhoneNum();
						
						new GreyWizard($('.sl-table-exp', rform), reservation_workflow).begin_workflow_on(0);
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
	
	var reservation_workflow = {
		slides : [
			{
				div_id  : 'reserve_step1',
				nav_vis : [
					['next', 'fadeIn'],
					['back', 'fadeOut'] 
				],
				action : function(wizard) {
					wizard.workflow.animate({'height': '380px'}, 'fast');
				},
				validate : function(wizard) {
					var form = $('#reservation_form1', wizard.workflow);

					return bool_submit_once_and_do(form, wizard, 2, function(response_data, next_slide) {
						next_slide.html(response_data).children().hide().fadeIn();
						$('.hintable', next_slide).hinty();
						if (wizard.workflow.height() != 610) wizard.workflow.animate({'height': '610px'}, 'fast');
					});
				} // END validate
			}, // END slide 1
			{ 
				div_id  : 'reserve_step2',
				nav_vis : [
					['next', function(btn, wizard){ btn.text('Next').data('done', false); }],
					['back', 'fadeIn']
				],
				action : function(wizard) {
					// expand slide 2 automatically if it's already filled (the user went back), otherwise this is handled in slide 1's validate method
					if ($('#reservation_form2', wizard.workflow).length) wizard.workflow.animate({'height': '610px'}, 'fast');
				},
				validate : function(wizard) {
					var form = $('#reservation_form2', wizard.workflow);
					
					return bool_submit_once_and_do(form, wizard, 3, function(response_data, next_slide) {
						next_slide.html(response_data).children().hide().fadeIn();
					});
				} // END validate
			}, // END slide 2
			{ 
				div_id  : 'reserve_step3',
				nav_vis : [
					['next', function(btn, wizard){ btn.text('Done').data('done', true); }],
					['back', 'fadeIn']
				],
				action : function(wizard) {
					wizard.workflow.animate({'height': '440px'}, 'fast');
					
					var map_dirs  = $('#gmap_dirs');
					if (!map_dirs.children().length) {
						map_dirs.jmap({ 
							mapCenter: [Gmaps_data.center.lat, Gmaps_data.center.lng] 
						}, function(map, el) { 
							$(el).jmap('SearchAddress', {
								query: ''
							}); 
						});
					}
				}
			} // END slide 3
		],
		finish_action : function(wizard) {
			wizard.workflow.parent().slideUp().removeClass('active').parent().find('.sl-table').removeClass('active');
		}
	};
	
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
	
	$('#get_dirs', '#map_partial').live('click', function(){
		var $this = $(this),
			from_address = $('#gmap_dirs', $this.parent().parent()).val();
		
		if (from_address != '') {
			var src = build_gmap_src({ from: from_address, to: $this.attr('rel'), title: $this.attr('title') });
			$map_wrap.append('<iframe />');
			$('iframe', $map_wrap).src('/ajax/get_dir_frame?script_src='+ src);
		}
		
		return false;
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
	$.setGmap = function(data) {
		Gmap = new GMap2(document.getElementById('main_map'));
		Gmap.addControl(new GLargeMapControl());
		Gmap.addControl(new GScaleControl());
		Gmap.addControl(new GMapTypeControl());
		Gmap.setCenter(new GLatLng(data.center.lat, data.center.lng), (data.center.zoom || 10));
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
	
	if (typeof GBrowserIsCompatible == 'function' && GBrowserIsCompatible() && typeof(Gmaps_data) != 'undefined' && $('#main_map').length > 0) {
		// Gmaps_data comes from a script rendered in views/listings/locator.html.erb
		$.setGmap(Gmaps_data);
	}
	
});

// updates the info tab count in the listings edit page. the tab text is: <label> (<count>)
function update_info_tab_count(label, i) {
	var	tab = $('#tab_'+ label, '#sl-tabs'),
		count = parseInt(tab.text().split('(')[1].replace(')', '')) + i;
	
	tab.text(label.replace('_', ' ') + ' ('+ count +')');
}

// build a query string for the google directions gadget: http://maps.google.com/help/maps/gadgets/directions/
function build_gmap_src(options) {
	var script_src = 'http://www.gmodules.com/ig/ifr?url=http://hosting.gmodules.com/ig/gadgets/file/114281111391296844949/driving-directions.xml'+
					 '&amp;up_fromLocation='+ escape(options.from) +
					 '&amp;up_myLocations='+ escape(options.to) +
					 '&amp;up_defaultDirectionsType='+ 
					 '&amp;synd=open'+
					 '&amp;w='+ (options.w || 320) +
					 '&amp;h='+ (options.h || 55) +
					 '&amp;title='+ escape(options.title) || 'Directions+by+Google+Maps'+
					 '&amp;brand=light'+
					 '&amp;lang='+ (options.lang || 'en') +
					 '&amp;country=US'+
					 '&amp;output=js';
	return script_src;
}