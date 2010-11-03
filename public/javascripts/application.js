/***************** UTILITY FUNCTIONS *****************/
$ = jQuery;
$(document).ready(function() {
	if ($('body').hasClass('home')) $('#dock').jqDock({ size: 60, attenuation: 400, fadeIn: 1000 });
	else $('#dock').jqDock({ size: 50, attenuation: 400, fadeIn: 1000 });
	
/******************************************* PAGE SPECIFIC BEHAVIOR *******************************************/
	
	// front page
	$('#search_submit, #search_submit2').click(function() {
		// the live submit handler in formbouncer doesn't seem to work on the search form
		// temporary workaround...
		return $(this).parents('form').runValidation().data('valid');
	})
	
	// ajaxify the login form and forgot password link
	$('#login_link').click(function() {
		// TODO: this is a quickfix, find out why in IE the login box closes even when clicking inside of it, good luck.
		if (!$.browser.msie) {
			var $this = $(this);
			if ($this.hasClass('active')) return false;

			$this.addClass('active');
			var pop_up = $('#pop_up_box').css({ top: '50px', right: '20px' });

			pop_up.fadeIn();
			$('input[type=text]', pop_up).eq(0).focus();
			$.bindPlugins();

			// close login box when user clicks outside of it
			$(document).click(function(e) {
				if ($(e.originalTarget).parents('#pop_up_box').length == 0) {
					pop_up.fadeOut(300, function() { 
						$('#login_link').removeClass('active');
						pop_up.hide();
					});
				}
			});

			return false;
		}
	});
	
	// log the user in and change the topbar to the logged in links
	$('#new_user_session', '#pop_up_box').live('submit', function() {
		var form = $(this).runValidation(),
			ajax_loader = $('.ajax_loader', form);
		
		if (form.data('valid')) {
			ajax_loader.show();
			
			$.post(form.attr('action'), form.serialize(), function(response) {
				if (response.success) {
					if (response.role == 'advertiser') {
						window.location = response.account_path;
					} else {
						$('#topbar').html(response.data);
						$('#pop_up_box').fadeOut(300, function(){ $(this).remove(); });
					}
				} else {
					$('#pop_up_box').html(response.data);
					$('.fieldWithErrors input', '#pop_up_box').eq(0).focus();
				}

				ajax_loader.hide();
			}, 'json');
		}
		
		return false;
	});
	
	$('#forgot_pass_link', '#pop_up_box').live('click', function() {
		$('#pop_up_box').load(this.href, function(response, status) {
			$('input[type=text]', this).eq(0).focus();
			$.bindPlugins();
		});
		return false;
	});
	
	$('#password_resets_form').live('submit', function() {
		var form = $(this).runValidation(),
			ajax_loader = $('.ajax_loader', form);
		
		if (form.data('valid')) {
			ajax_loader.show();
			
			$.post(form.attr('action'), form.serialize(), function(response) {
				form.html(response);
			});
		}
		
		return false;
	});
	
	// advanced search options
	var $size_picker = $('#size_picker'),
		$size_img = $('img', $size_picker),
		$size_select = $('#search_unit_size');
	
	// preload
	$('option', $size_select).each(function(){
		var img = new Image();
		img.src = $(this).attr('rel');
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
			new_img = $('<img src="'+ selected +'" alt="" />');
		
		if ($size_img.attr('src') != selected) {
			$size_img.fadeOut(100, function(){
				$size_picker.html(new_img)
				new_img.hide().fadeIn(120);
				$size_img = $('img', $size_picker);
				
				if (new_img.width() > 183) new_img.width(183);
			});
		}
	}
	
	var advanced_slider = $('.advanced_slider', '#advanced_opts'),
		advanced_slider_value = $('.slider_val', advanced_slider.parent()).val();

	advanced_slider.slider({
		max: 50,
		min: 5,
		step: 5,
		value: advanced_slider_value,
		animate: true,
		start: function(e, ui) {
			var slider = $('.slider_val', $(e.target).parent());
			if (slider.attr('disabled')) slider.attr('disabled', false);
		},
		slide: function(e, ui) {
			$('.slider_val', $(this).parent()).val(ui.value);
			$slider_handle.html('<span>'+ ui.value +'</span>');
		}
		
	});
	var $slider_handle = $('.ui-slider-handle', '.advanced_slider').html('<span>'+ advanced_slider_value +'</span>');
	
	$('.arrow', '#advanced_opts').click(function(){
		var value = parseInt(advanced_slider.slider('value')),
			new_val = $(this).attr('alt') == 'less' ? value - 5 : value + 5;
		
		if (new_val >= 50) new_val = 50;
		
		advanced_slider.slider('value', new_val);
		$slider_handle.html('<span>'+ new_val +'</span>');
	});
	
	// map pop up
	var map_nav_btn = $('#map_nav_btn');
	if (map_nav_btn.length > 0) {
		preload_us_map_imgs();
		
		map_nav_btn.click(function(){
			var partial = 'menus/map_nav', title = 'Choose A State', height = '486';
			
			get_pop_up_and_do({ 'title': title, 'height': height, 'modal': true }, { 'sub_partial': partial }, function() {
				new GreyWizard($('#map_nav'), {
					title		 : 'Choose a State',
					slides_class : 'map_flow_step',
					nav_id : 'map_flow_nav',
					slides : [
						{	
							pop_up_title : 'Click on a State',
							div_id  : 'map_step1',
							action  : map_flow_step1,
							nav_vis : [['back', 'hide']]
						},
						{ 
							pop_up_title : 'Pick a City',
							div_id  : 'map_step2',
							action  : map_flow_step2,
							nav_vis : [['back', 'fadeIn']]
						}
					]
				}).begin_workflow_on(0);
			});

			return false;
		});
		
		function map_flow_step1() {
			var wizard = arguments[0],
				$map_img = $('#map_nav_img', '#map_nav'),
				$areas = $('area', '#USMap'),
				$state_name = $('#state_name', '#map_nav');
				
			var add_map_overlay = function() {
				var area = $(this), img = $('<img class="map_overlay" src="/images/ui/storagelocator/us_map/'+ area.attr('rel') +'.png" alt="" />');
				$state_name.text(area.attr('alt'));
				$map_img.before(img);
			}; 
			$areas.unbind('mouseenter', add_map_overlay).live('mouseenter', add_map_overlay);

			var remove_map_overlay = function() {
				$state_name.text('');
				$('.map_overlay', '#map_nav').remove();
			};
			$areas.unbind('mouseleave', remove_map_overlay).live('mouseleave', remove_map_overlay);
			
			var get_cities = function() {
				var area = $(this), state = area.attr('alt');
				$state_name.text('Going to '+ state +'...');
				
				if (state == 'Washington DC') {
					window.location = '/self-storage/washington-dc';
					
				} else {
					if (wizard.slide_data[1].data && wizard.slide_data[1].data.state == state) {
						wizard.slide_data[1].build_city_list = false;
						wizard.next();

					} else {
						$.getJSON('/ajax/get_cities?state='+ state, function(response) {
							$.with_json(response, function(data){
								wizard.slide_data[1].build_city_list = true;
								wizard.slide_data[1].pop_up_title = 'Pick a City in '+ state
								wizard.slide_data[1].data = { state: state, cities: data };
								wizard.next();
							});
						});
					}
				}
				

				return false;
			};
			$areas.unbind('click', get_cities).live('click', get_cities);
		}
		
		function map_flow_step2() {
			var wizard = arguments[0];
			$('#city_name').remove();
			
			if (wizard.slide_data[1].build_city_list) {
				var list = $('#cities_list', '#map_step2').html(''),
					city_nav = $('#city_nav', '#map_step2').html(''),
					city_link = $('<a href="/self-storage/"><span>Self Storage in </span></a>');
				
				for (var i = 0, len = wizard.slide_data[1].data.cities.length; i < len; i++) {
					var letter = wizard.slide_data[1].data.cities[i][0],
						cities = wizard.slide_data[1].data.cities[i][1],
						new_list = $('<li id="cities_'+ letter +'" class="tab_content"></li>');
						
					city_nav.append('<li><a rel="cities_'+ letter +'" href="#'+ letter +'">'+ letter +'</a></li>');
					
					for (var j = 0, len2 = cities.length; j < len2; j++) {
						var new_city = city_link.clone(), city = cities[j];
						
						new_city.show().attr('href', city_link.attr('href') + wizard.slide_data[1].data.state +'/'+ city.toLowerCase().replaceAll(' ', '-'));
						new_city.find('span').hide().after(city);
						new_list.append(new_city);
					}
					
					list.append(new_list);
				}
				
				$('#map_step2').tabular_content();
				
				var city_click = function() {
					$('#map_step2', '#map_nav').append('<p id="city_name">Looking for '+ $(this).text() +', '+ wizard.slide_data[1].data.state +'...</p>');
				}
				$('li a', list).unbind('click', city_click).live('click', city_click);
			}
		}
	}
	
	// steps
	$('p', '#steps').hide();
	var $steps = $('.in', '#steps'),
	    fade_anim_speed = 3400
	    //fade_anim_int = setTimeout(stepsFadeAnim, 1000);
	
	$steps.hover(function(){
		fade_anim_step = $steps.index(this);
		
		$('img', $steps).fadeIn(600);
		$('p', $steps).fadeOut(600);
		
		$('img', this).fadeOut();
		$('p', this).fadeIn();
		//clearTimeout(fade_anim_int);
		
	}, function(){
		$('p', this).fadeOut();
		$('img', this).fadeIn();
	});
	
	function stepsFadeAnim() {
		if (typeof(fade_anim_step) == 'undefined' || fade_anim_step >= $steps.length-1) fade_anim_step = -1;
		fade_anim_step++;
		
		$('img', $steps).fadeIn(600);
		$('p', $steps).fadeOut(600);
		
		$('img', $steps.eq(fade_anim_step)).fadeOut(1200);
		$('p', $steps.eq(fade_anim_step)).fadeIn(1200, function(){
			
			setTimeout(function(){
				clearTimeout(fade_anim_int);
				fade_anim_int = setTimeout(stepsFadeAnim, fade_anim_speed);
			}, fade_anim_speed);
			
		});
	}
	
	// more info button
	var more_info_tab = $('#red_tab'),
		orig_info_txt = more_info_tab.text(),
		more_info_div = $('#'+ more_info_tab.attr('rel')).hide();
		
	more_info_tab.click(function(){
		if (!more_info_tab.data('open')) {
			more_info_div.slideDown(1000);
			more_info_tab.data('open', true).text('Click to close');
		} else {
			more_info_div.slideUp(1000);
			more_info_tab.data('open', false).text(orig_info_txt);
		}
	});
	
	$('#handle').click(function(){
		if (more_info_tab) more_info_tab.click();
	});
	
	$('#advanced_opts', '#pages_controller.home').hide();
	
	// Cities pages
	$('.storage_in_city', '#cities_list').css('width', '23%');
	$('.storage_in_city span', '#cities_list').hide();
	
	
	
	// storage tips page
	var tips_head = $('#tips-head'); 
	if (tips_head.length > 0) {
		var tips_show = {
			delay : 5000,
			context : tips_head,
			slides : [
				{
					start : function(s){
						if ($('.bubble, .purple_bgs', s.context).length < 6) {
							var tips_inner_html = '<div class="purple_bgs" id="bg1"></div><div class="purple_bgs" id="bg2"></div><div class="purple_bgs" id="bg3"></div><div class="bubble" id="bub1"></div><div class="bubble" id="bub2"></div><div class="bubble" id="bub3"></div>';
							$('.bubble, .purple_bgs', s.context).remove();
							tips_head.append(tips_inner_html);
						}
					},
					objects : [
						{ id : 'bg3', action: 'fadeIn', speed: 500, delay: 500 },
						{ id : 'bub1', action: 'fadeIn', speed: 800, delay: 5000, callback: function(o, s){ o.html('<blockquote>I found it on USSelfStorageLocator.com</blockquote>').children().hide().fadeIn('slow') } }
					],
					end : function(s) { s.gotoSlide(1); }
				},
				{
					objects : [
						{ id : 'bg1', action: 'fadeIn', speed: 500, delay: 500 },
						{ id : 'bub2', action: 'fadeIn', speed: 1000, delay: 6000, callback: function(o, s){ o.html('<blockquote>Online reservations are so convenient</blockquote>').children().hide().fadeIn('slow') } }
					],
					end : function(s) { s.gotoSlide(2); }
				},
				{
					objects : [
						{ id : 'bg2', action: 'fadeIn', speed: 500, delay: 500 },
						{ id : 'bub3', action: 'fadeIn', speed: 1000, delay: 8000, callback: function(o, s){ o.html('<blockquote>They helped me get a really great deal!</blockquote>').children().hide().fadeIn('slow') } }
					],
					end : function(s) { s.gotoSlide(0); }
				}
			]
		};
		
		var slideshow = new GreyShow(tips_show);
		slideshow.start();
	}
	
	// listings show page
	
	// the google map breaks when it's loaded in a hidden div, then shown by js
	$('a[rel=sl-tabs-map]').click(function(){
		var map = $('#sl-tabs-map');
		// this is a function produced by the Gmap.html() method called from the template, it's provided by the google_map plugin
		// check the header area of the source html for the method definition
		if (!map.is(':hidden')) center_google_map();
	});
	
	// edit site settings page
	// turns a label into a textfield on mouseover, then uses callback to bind an event
	// to the new textfield to turn it back into a label when it blurs
	$('.textFieldable', '#SiteSettingFields .new_setting_field').live('mouseover', function(){
		var $this = $(this),
				settings_field_html = '<input name="new_site_settings[][key]" value="'+ $this.text() +'" class="hintable required" title="Enter a setting name" />';
		
		$(this).textFieldable(settings_field_html, function(text_field){
			$.revertSettingsTextFieldToLabel(text_field, $this.text());
		});
	});
	
	$('.textFieldable', '#SiteSettingFields .existing_setting_field').live('click', function(){
		var $this = $(this),
				existing_settings_html = '<input name="site_settings['+ $this.text() +']" value="'+ $this.text() +'" class="hintable required" title="Enter a setting name" />';
		
		$this.textFieldable(existing_settings_html, function(text_field){
			$.revertSettingsTextFieldToLabel(text_field, $this.text());
		});
		
		return false;
	});
	
	if ($.on_page([['compare', 'listings']])) $.open_map($('#main_map'));
	
	if ($.on_page([['locator', 'listings']])) {
		var main_map = $('#main_map');
		
		$('#top_map_btn').live('click', function(){
			var $this = $(this),
				location = $this.attr('rel').split(','),
				lat = parseFloat(location[0]),
				lng = parseFloat(location[1]);

			if ($this.text() == 'Show Map') {
				if ($.on_page([['locator', 'listings']])) $.cookie('main_map_open', true, { expires: 30 });
				$('span', $this).text('Hide Map');
				main_map.slideDown();
			} else {
				if ($.on_page([['locator', 'listings']])) $.cookie('main_map_open', null);
				$('span', $this).text('Show Map');
				main_map.slideUp();
			}

			// center the map the first time it opens
			if (main_map.is(':visible')) setTimeout(function(){
				Gmap.checkResize();
				Gmap.setCenter(new GLatLng(lat, lng), 12);
			}, 300);
		});
		
		if (!$.cookie('main_map_open')) {
			$.cookie('main_map_open', true);
			$.open_map(main_map);
		}
		
		/*/ move the sidebar with the page
		var move_me = $('#content_bottom .region_content_bottom');
		$(window).scroll(function(e){
			if (e.currentTarget.scrollY >= 176) move_me.css({ position: 'fixed', top: '15px' });
			else move_me.css({ position: 'static'  });
		});*/
	}
	
	// New Permissions
	if ($.on_page([['new', 'permissions, roles']])) {
		$('a.add_link', '.partial_addable').click();
	} // END New Permissions
	
	// user tips page
	$('a', '#sort').live('click', function() {
		get_partial_and_do({ partial: 'views/partials/tips', sort_by: this.href.replace('#', ' ') }, function(response) {
			$.with_json(response, function(partial) {
				$('#tips_view').replaceWith(partial);
			});
		});
	});
	
	$('input', '#search_tips').keyup(function() {
		var parent = function() { return $(this).parents('.blog-lock') };
		$('h3 a, div', '.blog-lock').search(this.value, 'by substring', { remove: parent });
	});
	
	// add your facility
	$('form#new_client').submit(function() {
		if (!$('#chk_avail').hasClass('avail')) check_client_email_avail($('#client_email', this));
		
		var signup_form = $(this).runValidation();
		
		if (signup_form.data('valid') && !signup_form.data('saving')) {
			signup_form.data('saving', true);
			
			// 1). gather the facility name and location and ask the server for matching listings to allow the user to pick
			var pop_up_title  = 'Add Your Facility',
				pop_up_height = 'auto',
				sub_partial   = '/clients/signup_steps',
				ajax_loader	  = $('#submit_wrap .ajax_loader', this).show(),
				current_step  = 1,
				form_data     = { 
					company : $('#client_company', signup_form).val(),
					email 	: $('#client_email', signup_form).val(),
					city 	: $('#listing_city', signup_form).val(),
					state 	: $('#listing_state', signup_form).val()
				};
			
			$.post('/ajax/find_listings', form_data, function(response){
				$.with_json(response, function(data){
					get_pop_up_and_do({ 'title': pop_up_title, 'height': pop_up_height, modal: true }, { 'sub_partial': sub_partial }, function(pop_up){ // prepping step 2
						var wizard = new GreyWizard($('#workflow_steps', pop_up), workflow_settings);
						
						if (data[0]) { // we found matching listings, start on the first step of the workflow
							workflow_settings.slides[0].data = data;
							wizard.begin_workflow_on(0);
							
						} else wizard.begin_workflow_on(1);
						
						signup_form.data('saving', false);
					});
				});
			}, 'json');
		} 
		
		return false;
	});
	
	$('#chk_avail').click(function(){ return false; });
	$('#client_email', '#new_client').blur(function() { check_client_email_avail($(this)); });
	
	function check_client_email_avail(email_input) {
		var form = $('#new_client').data('saving', true), // will prevent the form from submitting
			chk_avail = $('#chk_avail', email_input.parent()).removeClass('avail').removeClass('not_avail'), email = email_input.val(),
			ajax_loader = $('.ajax_loader', email_input.parent());
			
		if (email == '' || email == email_input.attr('title')) return false;
		
		if (!chk_avail.data('checking')) {
			ajax_loader.show();
			chk_avail.text('Checking').data('checking', true);
			
			$.getJSON('/ajax/find?model=Client&by=email&value='+ email, function(response) {
				$.with_json(response, function(data) {
					if (data.length) {
						email_input.addClass('invalid').focus();
						chk_avail.text('Already Taken').attr('title', 'You may have already signed up in the past. Try logging in.').removeClass('avail').addClass('not_avail');
					} else {
						email_input.removeClass('invalid');
						form.data('saving', false);
						chk_avail.text('Available').attr('title', 'Good to go!').removeClass('not_avail').addClass('avail');

						if (form_has_inputs_filled(form, ['#listing_city', '#listing_state']))
							form.submit();
					}
					
					chk_avail.data('checking', false);
				});

				ajax_loader.hide();
			});
		}
	}
	
	function form_has_inputs_filled(form, input_ids) {
		var all_filled = true;
		
		$.each(input_ids, function(){
			var input = $(eval("'"+ this +"'"));
			
			if (input.val() == '' || input.val() == input.attr('title')) all_filled = false;
		});
		
		return all_filled;
	}
	
	// CLIENT EDIT page
	if ($.on_page([['edit', 'clients']])) {
		$('.selective_hider').live('click', function(){
			var dont_hide = $(this).attr('rel'), hide_these = $('.hideable');
			
			if (dont_hide) hide_these.each(function(){
				if (this.id != dont_hide) $(this).slideUp();
				else $(this).slideDown();
			});
			else hide_these.slideDown();

			return false;
		});
		
		$('#reservations', '#ov-services').click(function(){
			if ($('#issn_enabled').val() != 'false') {
				get_pop_up_and_do({ title: 'Reservations', height: '510', modal: true }, { sub_partial: 'clients/reservations', model: 'Client', id: $('#client_id').text() }, function(pop_up) {
					pop_up.css('background-image', 'none');
				});
				
			} else {
				var partial = 'clients/issn_steps', 
					title = 'Activate Real Time Reservations', 
					height = 'auto';

				get_pop_up_and_do({ title: title, height: height, modal: true }, { sub_partial: partial, model: 'Client', id: $('#client_id').text() }, function(pop_up) {
					new GreyWizard($('#issn_steps', pop_up), {
						title  : title,
						slides : [
							{	
								pop_up_title : title,
								div_id  : 'issnstep_1',
								action  : issnstep1,
								nav_vis : [['back', 'hide'], ['next', function(btn, wizard) { btn.text('Next').data('done', false).fadeOut(); }]]
							},
							{ 
								pop_up_title : 'Grant Access',
								div_id  : 'issnstep_2',
								action  : issnstep2,
								nav_vis : [['back', 'fadeIn'], ['next', function(btn, wizard){ btn.text('Done').data('done', true).fadeIn(); }]]
							}
						],
						finish_action: 'close'
					}).begin_workflow_on(0);
				});
			}
			
			return false;
		});
		
		function issnstep1(wizard) {
			$('#issn_status_option a', '#issnstep_1').unbind('click').click(function(){
				wizard.next();
				return false;
			});
			$('#slide_nav').remove();
		}
		
		function issnstep2(wizard) {
			if (typeof wizard.slide_data[1].client_info == 'undefined') {
				$.getJSON('/ajax/get_partial?partial=clients/issn_agreement&model=Client&id='+ $('#client_id').text(), function(response){
					$.with_json(response, function(data){
						wizard.slide_data[1].client_info = data;
						$('#client_info_preview', wizard.workflow).append(data);
						
						wizard.workflow.animate({ height: '900px' });
						
						// printing the page doesn't show the select's value so put it in a hidden span which is visible in the print css
						var pm_select = $('select[name=pm_software]', wizard.workflow);
						pm_select.change(function(){ 
							pm_select.removeClass('invalid'); 
							
							var span = pm_select.siblings('.val');
							if (!span.length) 
								span = pm_select.after('<span class="val dp"></span>').siblings('.val');
							
							span.text(pm_select.val());
						});
						
						// make sure they select a pm software before printing
						$('.ps', wizard.workflow).click(function(){
							if (pm_select.val() == '') {
								pm_select.addClass('invalid');
								return false;
							}
						});
					});
				});
				
			} else $('#client_info_preview', wizard.workflow).html(wizard.slide_data[1].client_info);
			
		}
		
		$('.pagination a, .table_sorter', '#pop_up').live('click', function() {
			$('#pop_up').load(this.href + ' #pop_up > div');
			return false;
		});
		
		$('.rsvr_detail_link', '#client_reservations').live('click', function(){
			var $this = $(this),
				detail_box = $('.reservation_wrap', $this.parent()),
				ajax_loader = $('.ajax_loader', $this.parent()).show();
			
			if (detail_box.length == 1) {
				$('.reservation_wrap', 'td.region').hide();
				detail_box.show();
				ajax_loader.hide();
				
			} else {
				$.getJSON(this.href, {}, function(response) {
					$.with_json(response, function(data){
						var box = $(data).append('<a class="close_btn" href="#">X</a>');

						$('.reservation_wrap', 'td.region').hide();
						box.appendTo($this.parent());
					});
					
					ajax_loader.hide();
				});
			}
			
			
			return false;
		});
		
		$('.close_btn', '.reservation_wrap').live('click', function() {
			$(this).parent().hide();
			return false;
		});
		
		$('.inline_save').live('focus', function() {
			var input = $(this);
			input.after('<a class="submit_btn" href="#">Save</a>');
		});
		
		$('.attribute_save').live('click', function() {
			var save_btn = $(this),
				input = $('.inline_save', save_btn.parent());
			
			if (input.val() != '' && input.val() != inline_save_orig_values[input.attr('id')]) {
				save_btn.attr('href', save_btn.attr('href') + input.value)
			}
			$.log(this, inline_save_orig_values)
			return false;
		});
		
	} // END page clients edit
	
	// client and listing edit page
	$('.hint_toggle').live('click', function() {
		var btn = $(this),
			hint = btn.parents('.user_hint'),
			placement_id = btn.parent('p').attr('id').replace('UserHintPlacement_', ''),
			ajax_loader = $('.ajax_loader', hint).show();

		$.updateModel('/user_hints/'+ btn.attr('rel') +'/'+ placement_id, { model: 'UserHintPlacement' }, function(data){
			hint[btn.attr('rel') == 'hide' ? 'slideUp' : 'slideDown'](900);
			hint.children()[btn.attr('rel') == 'hide' ? 'fadeOut' : 'fadeIn'](600);
			ajax_loader.hide();
		});
		
		return false;
	});
	
	$('input', '#user_hint_toggles').click(function(){
		$('.hint_toggle[rel='+ this.value +']:'+ (this.value == 'open' ? 'hidden' : 'visible' )).click();
	});
	
	// Listing Edit
	// NEW LISTING WORKFLOW
		// 1). Click NEW button, get a partial from the server and prepend to the listing box
		$('#add_fac', '#ov-units').click(function(){
			var $this 		   = $(this),
				listing_box    = $('#client_listing_box', $this.parent().parent()),
				ajax_loader    = $this.prev('.ajax_loader').show();
		
			// GET PARTIAL
			$.getJSON('/ajax/get_partial?model=Listing&partial=/listings/listing', function(response){
				$.with_json(response, function(data){
					var partial 	  = $(data).hide(),
						title_input   = $('input[name="listing[title]"]', partial),
						tip_text	  = $('.new_listing_tip', partial);

					// insert the new listing into either the #empty_listings box or #rslt-list-bg
					if ($('.listing', listing_box).length == 0) listing_box.html('<div id="rslt-list-bg"></div>').find('#rslt-list-bg').append(partial);
					else $('#rslt-list-bg', listing_box).prepend(partial);

					$('.listing', listing_box).removeClass('active');
					partial.addClass('active').slideDown(300, function() { 
						tip_text.fadeIn(600);
						title_input.focus();
					});

					bind_listing_input_events();
					$.bindPlugins();
				});
				
				ajax_loader.hide();
			});
		
			return false;
		});
		
		$('.cancel_link', '#client_listing_box').live('click', function() {
			var $this = $(this),
				listing = $this.parents('.listing'),
				listing_id = listing.attr('id');
				
			if (listing_id.length) delete_client_listing(listing_id);
			else listing.slideUp('fast', function(){ $(this).remove() });
			
			return false;
		});
		
		$('.delete_link', '#client_listing_box').click(function() {
			var listing_id = $(this).parents('.listing').attr('id');
			delete_client_listing(listing_id);
			
			return false;
		});
		
		function delete_client_listing(listing_id) {
			if (confirm('Are you sure you want to delete this facility and all information associated with it?')) {
				var ajax_loader = $('.ajax_loader', '#ov-units-head').show();
				
				$.post('/clients/'+ $('#client_id').text() +'/listings/'+ listing_id.replace('Listing_', '') +'/disable', { authenticity_token: $.get_auth_token() }, function(response) {
					$.with_json(response, function(data) {
						$('#'+ listing_id).slideUp('fast', function(){ $(this).remove() });
					});
					
					ajax_loader.hide();
				});
			}
		}
	
		// 2). bind events to the inputs in the new partial: 
		// SAVE TITLE ON BLUR
		$('.listing:eq(0) input[name="listing[title]"]', '#client_listing_box').live('blur', function(){
			var partial 	  = $('.listing:eq(0)', '#client_listing_box'),
				title_input   = $('input[name="listing[title]"]', partial).removeClass('invalid'),
				tip_text	  = $('.new_listing_tip', partial),
				tip_inner	  = tip_text.find('strong'),
				listing_id	  = partial.attr('id') ? partial.attr('id').replace('Listing_', '') : null;
				ajax_loader   = $('#add_fac', '#ov-units').prev('.ajax_loader').show();
			
			if (title_input.val() != '' && title_input.val() != title_input.attr('title')) {
				tip_text.animate({ top: '36px' }); // MOVE TIP TEXT down to address row
				tip_inner.text('Enter the street address.');
				ajax_loader.show();
				
				var params = { title: title_input.val() };
				if (listing_id) params['id'] = listing_id;
				
				$.post('/listings/quick_create', params, function(response){
					if (response.success) partial.attr('id', 'Listing_'+ response.data.listing_id);
					else title_input.addClass('invalid').focus(); // SERVER VALIDATION DID NOT PASS
					
					ajax_loader.hide();
				}, 'json');
			
			} else {
				title_input.focus();
				ajax_loader.hide();
				setTimeout(function() { title_input.addClass('invalid') }, 300); // wait a little bit to turn this red, just in case the clicked on cancel and the listing is slideing up
			}
		
		});
		
		// a collection of the input names and the msg to change the tip to, and the method with which to change the tip
		var listing_tip_inner_tag = 'strong',
			listing_input_msgs = [
				['address', 'Type in the city.', function(tip_text, msg){
					tip_text.animate({ top: '60px' }); // MOVE TIP TEXT down to city state zip row
					tip_text.find(listing_tip_inner_tag).text(msg);
				}],
				['city', 'Enter the 2 letter State abbrev.', function(tip_text, msg){
					tip_text.find(listing_tip_inner_tag).text(msg);
				}],
				['state', 'Enter the 5 digit zip code.', function(tip_text, msg){
					tip_text.find(listing_tip_inner_tag).text(msg);
				}],
				['zip', '<strong>Almost Done! Click Save.</strong>', function(tip_text, msg){
					tip_text.css('text-align', 'right').html('<strong>Almost Done! Click Save.</strong>');
				}]
			];
		
		function bind_listing_input_events() {
			$.each(listing_input_msgs, function(){
				var input_name = this[0], blur_msg = this[1], done_action = this[2],
					tip_text   = $('.new_listing_tip', '.listing:eq(0)');
				
				$('input[name="listing[map_attributes]['+ input_name +']"]', '.listing:eq(0)').live('blur', function(){
					var input = $('input[name="listing[map_attributes]['+ input_name +']"]', '.listing:eq(0)').removeClass('invalid');

					if (input.val() != '' && input.val() != input.attr('title')) done_action.call(this, tip_text, blur_msg);
					else input.focus().addClass('invalid');

				});
			});
			
			// SAVE ADDRESS WHEN USER CLICKS SAVE BUTTON
			$('.action_btn a', '.listing:eq(0)').live('click', function(){
				var partial 	= $('.listing:eq(0)', '#client_listing_box'),
					button  	= $(this),
					ajax_loader = $('#add_fac', '#ov-units').prev('.ajax_loader');

				if (!button.data('saving') && button.text() == 'Save' && form_inputs_valid('.rslt_contact')) {
					button.data('saving', true);
					ajax_loader.show();

					var listing_id = partial.attr('id').replace('Listing_', ''),
						attributes = {
							address : $('input[name="listing[map_attributes][address]"]', partial).val(),
							city 	: $('input[name="listing[map_attributes][city]"]', partial).val(),
							state 	: $('input[name="listing[map_attributes][state]"]', partial).val(),
							zip 	: $('input[name="listing[map_attributes][zip]"]', partial).val()
						};

					// SAVE ADDRESS WHEN USER CLICKS SAVE
					$.post('/listings/'+ listing_id, { _method: 'put', listing: { map_attributes: attributes }, from: 'quick_create', authenticity_token: $.get_auth_token() }, function(response){
						console.log(response)
						$.with_json(response, function(data){
							button.text('Edit').unbind('click').attr('href', '/clients/'+ $('#client_id').text() +'/listings/'+ listing_id +'/edit');
							
							listing = $(data);
							partial.html(listing.html()).removeClass('active');
							$('#listings_size').text(parseInt($('#listings_size').text()) + 1);
						});

						button.data('saving', false);
						ajax_loader.hide();

					}, 'json');

					return false;
				}
			});
		} // END bind_listing_input_events()
		
		function form_inputs_valid(context) {
			$('.i', context).each(function(){
				if ($(this).hasClass('invalid')) return false;
			});
			return true;
		}
		
		// END 2). bind events to listing inputs
		
	// END new listing workflow
	
	// business hours edit form, listing page
	$('.all_day_check').change(function(){
		var day_check = $(this), context = day_check.parent().parent().parent();
		day_check.data('was_checked', day_check.is(':checked'));
		
		if (day_check.is(':checked')) {
			$('select, input[type=hidden]', context).attr('disabled', true);
			
			$('.day_closed', context).each(function(){
				var check = $(this);
				check.data('was_checked', check.is(':checked'));
			});
			
			$('.day_closed', context).attr('checked', false);
		} else {
			$('.day_closed', context).each(function(){
				var check = $(this);
				
				if (check.data('was_checked') && !check.is(':checked')) {
					check.attr('checked', true);
					$('select, input[type=hidden]', check.parent()).attr('disabled', false);
				}
			});
		}
	});
	
	$('.hour_range', '#business_hours_form').each(function(){
		var fields = $('select, input[type=hidden]', this),
			checkbox = $(':checkbox', $(this).parent());
		
		if (!checkbox.is(':checked')) fields.attr('disabled', true);
		else fields.attr('disabled', false);
	});
	
	
	
	$('.day_closed', '#business_hours_form').live('change', function(){
		var check = $(this),
			all_day_check = $('.all_day_check', check.parents('.hours_display'));
		
		check.data('was_checked', check.is(':checked'));
		
		if (check.is(':checked')) $('select, input[type=hidden]', $(this).parent().find('.hour_range')).attr('disabled', false);
		else $('select, input[type=hidden]', $(this).parent().find('.hour_range')).attr('disabled', true);
		
		// TODO: move the all_day_check out of this func, so it doesn't get overwritten after multiple clicks from one check
		if ($('.day_closed:checked', check.parents('.hours_display')).length == 1) {
			all_day_check.data('was_checked', all_day_check.is(':checked'));
			all_day_check.attr('checked', false);
		} else if ($('.day_closed:checked', check.parents('.hours_display')).length == 0) {
			all_day_check.attr('checked', all_day_check.data('was_checked'));
		}
	});
	
	$('.copy_all_hours', '#business_hours_form').click(function(){
		var monday_range = $(this).parent(),
			checked = $(':checkbox', monday_range.parent()).is(':checked'),
			monday_hours = $('select', monday_range),
			other_hours = $('.hour_range select', monday_range.parent().parent()).not(monday_hours);
			
		other_hours.each(function(){
			var this_hour = $(this),
				this_day = this_hour.parent().parent();
			
			if (this_hour.attr('rel') == 'opening') this_hour.val(monday_hours.eq(0).val());
			else if (this_hour.attr('rel') == 'closing') this_hour.val(monday_hours.eq(1).val());
			
			$(':checkbox', this_day).attr('checked', checked);
			$('select, input[type=hidden]', this_day).attr('disabled', !checked);
		});
		
		return false;
	});
	
	$('#save_hours', '#business_hours_form').click(function(){
		var $this = $(this),
			form = $this.parents('form').runValidation(),
			ajax_loader = $('.ajax_loader', form);
		
		if (form.data('valid') && !form.data('saving')) {
			form.data('saving', true);
			ajax_loader.show();
			
			$.post(form.attr('action'), form.serialize(), function(response) {
				$.with_json(response, function(data){
					$this.after('<span id="msg">Saved!</span>');
					setTimeout(function(){ $('#msg', form).fadeOut(1000, function(){ $(this).remove() }); }, 3000);
				});
				
				form.data('saving', false);
				ajax_loader.hide();
			});
		}
		
		return false;
	});
	
	// unit sizes form
	$('#sync_listing').click(function() {
		var $this = $(this).text('Syncing'),
			ajax_loader = $this.siblings('.ajax_loader').show(),
			sizes_in = $('#sl-tabs-sizes-in').addClass('faded');
		
		$('.edit-btn', sizes_in).hide();
		
		$.post($this.attr('href'), {}, function(response) {
			$.with_json(response, function(data){
				$this.text('Reloading');
				
				$.getJSON('/ajax/get_partial?model=Listing&id='+ $('#listing_id').val() +'&partial=listings/sizes', function(resp){
					if (resp.success) sizes_in.replaceWith($(resp.data).find('#sl-tabs-sizes-in'));
					else $.ajax_error(resp);
					
					ajax_loader.hide();
					$this.text('Sync');
				});
			});
		}, 'json');
		
		return false;
	});
	
	// upload pics
	$('#picture_facility_image', '#new_picture').live('change', function(){
		var thumb = $('<li><img src="/images/ui/ajax-loader-lrg.gif" class="loading" alt="" /><a class="iconOnly16 delete_link right" title="Delete this picture">Delete</a></li>');;
		
		if ($('.big-pic', '#sl-tabs-pict-in').length == 0) {
			var image = $('<img class="big-pic" src="" alt="" />');
			$('.gallery', '#sl-tabs-pict-in').append(image);
		}
		
		if ($(this).val() != '') $('#new_picture').ajaxSubmit({
			dataType: 'json',
			beforeSubmit: function(arr, $form, options) {
				$('#sl-tabs-pict-gall').append(thumb);
				thumb.hide().fadeIn(600);
				setTimeout(function(){ $('#picture_facility_image', $form).val('') }, 100);
			},
			success: function(response){
				$.with_json(response, function(data){
					var thumb_img = $('img', thumb);
					thumb_img.attr({ src: data.thumb, id: 'Picture_'+ data.id }).removeClass('loading');
					thumb_img.next('a').attr('href', '/listings/'+ data.listing_id +'/pictures/'+ data.id);
					
					if (image) image.attr('src', data.image);
					
					thumb_img.trigger('mouseover');
					update_info_tab_count('Pictures', 1);
				});
			}
		});
	});
	
	// change big-pic when thumb is hovered
	$('img', '#sl-tabs-pict-gall').live('mouseover', function(){
		if ($(this).hasClass('loading')) return false;
		var big_pic = $('.big-pic', '#sl-tabs-pict-in');
		if (big_pic.length == 0) return false;
		
		
		$('img', '#sl-tabs-pict-gall').removeClass('active')
		var thumb = $(this),
			new_src = thumb.attr('src').replace('/thumb_', '/medium_');
		
		thumb.addClass('active');
		big_pic.attr('src', new_src).attr('alt', thumb.attr('alt'));
	});
	
	$('.delete_link', '#sl-tabs-pict-gall').live('click', function(){
		if (!$(this).data('deleting') && confirm('Are you sure you want to delete this picture?')) {
			$(this).data('deleting', true).css('background-image', 'url('+ $('.ajax_loader').attr('src') +')');
			
			var img = $(this).prev('img'),
				id = img.attr('id').replace('Picture_', '');

			$.post($(this).attr('href'), { _method: 'delete', authenticity_token: $.get_auth_token() }, function(response){
				$.with_json(response, function(data){
					if (img.hasClass('active')) $('img:not(#'+ img.attr('id') +')', '#sl-tabs-pict-gall').trigger('mouseover');
					img.parent().fadeOut(600, function(){ $(this).remove() });
					
					if ($('img', '#sl-tabs-pict-gall').length == 1) $('.big-pic', '#sl-tabs-pict-in').eq(0).fadeOut(900, function(){ $(this).remove() });
					
					update_info_tab_count('Pictures', -1);
				});
				
				$(this).data('deleting', false);
			}, 'json');
		}
		
		return false;
	});
	
	$('#account_home_link').click(function() {
		// for some reason the stats_graph div was getting a width of 400px when the page loaded with it hidden (navigated from the listing edit page through one of the client option links)
		$('#stats_graph').css('width', '700px');
		init_stats_graph();
	});
	
	$('.auto_change', '#ov-reports-cnt').change(function(){
		$('#stats_graph').children().fadeOut('slow', function() { $(this).remove() });
		init_stats_graph({ months_ago : this.value, force: true });
	});
	
	function init_stats_graph(options) {
		if (typeof options == 'undefined') var options = {}
		var stats_graph = $('#stats_graph'),
			days_ago = options.days_ago || 0,
			months_ago = options.months_ago || 1,
			years_ago = options.years_ago || 0,
			force = options.force || false;
		
		if (stats_graph.length > 0) {
			stats_graph.addClass('loading');

			var issn_enabled = $('input#issn_enabled').val() == 'false' ? false : true,
				stats_models = 'clicks,impressions,'+ (issn_enabled ? 'reservations' : 'info_requests'),
				d = new Date(), // getMonth returns 0-11
				end_date = new Date(d.getFullYear(), d.getMonth(), d.getDate()+1),
				start_date = new Date((d.getFullYear() - years_ago), (d.getMonth() - months_ago), (d.getDate() - days_ago)); // month in the past

			$.getJSON('/ajax/get_client_stats?start_date='+ start_date +'&end_date='+ end_date +'&stats_models='+ stats_models +'&client_id='+ $('#client_id').text(), function(response){
				$.with_json(response, function(data){
					var plot_data = [],
						stats_arr = stats_models.split(/,\W?/);

					for (i in stats_arr) 
						plot_data.push(data['data'][stats_arr[i]]);

					$.jqplot('stats_graph', plot_data, {
						axes: {
							xaxis: { 
								renderer: $.jqplot.DateAxisRenderer,
								rendererOptions: { tickRenderer: $.jqplot.CanvasAxisTickRenderer },
					            tickOptions: { formatString:'%b %#d, %Y', fontSize:'12px' }
							},
							yaxis: { min: 0, max: parseInt(data['max']) + 1 },
						},
						legend: { show: true, location: 'nw', xoffset: 10, yoffset: 10 },
						series: [ 
					        { label: '&nbsp;Clicks', lineWidth: 2, color: '#3333CC', markerOptions: { style: 'diamond', color: '#3333CC' } }, 
					        { label: '&nbsp;Impressions', lineWidth: 2, color: '#FED747', markerOptions: { size: 7, style:'circle', color: '#FED747' } }, 
					        { label: '&nbsp;'+ (issn_enabled ? 'Reservations' : 'Requests'), lineWidth: 2, color: '#339933', markerOptions: { style: 'circle', color: '#339933' } }
					    ],
						highlighter: { sizeAdjust: 7.5 },
						cursor: { show: true, zoom: true, followMouse: true, tooltipLocation: 'ne' },
						grid: { background: '#ffffff' }
					});
				});

				stats_graph.removeClass('loading');
			});
		}
	}
	init_stats_graph({ months_ago : $('select.auto_change', '#ov-reports-cnt').val() });
	
	// Client tips block
	$('.client_tip:not(:first)', '#tips-box').hide();
	var client_tip_boxes = $('.client_tip', '#tips-box');
	
	if (client_tip_boxes.length > 0) {
		$('a', '#tips-box-bottom').click(function() {
			console.log(this, client_tip_boxes)
			if (client_tip_boxes.length > 1) {
				var $this = $(this),
					direction = $this.attr('id') == 'next_tip' ? 1 : -1,
					current_tip = $('.client_tip:visible', '#tips-box'),
					current_index = client_tip_boxes.index(current_tip),
					new_index = current_index + direction;
				
				if (new_index == client_tip_boxes.length) new_index = 0;
				else if (new_index < 0) new_index = client_tip_boxes.length - 1;

				current_tip.hide();
				$(client_tip_boxes[new_index]).show();
			}
			
			return false;
		});
	}
		
	// TODO: refactor all button events that do ajax calls
	// first refactor: save buttons, they have a form to submit activerecord models and return a form partial to replace html with updated content
	$('.save_btn').click(function(){
		var $this = $(this),
			form = $('form', $this.attr('context')).runValidation(), // the context the form is in
			ajax_loader = $($this.attr('loader')); // the context the ajax_loader is in
			console.log($this.attr('loader'), ajax_loader)
		if (form.data('valid') && !form.data('saving')) {
			form.data('saving', true);
			$this.text('Updating');
			ajax_loader.show();
			
			$.post(form.attr('action'), form.serialize(), function(response) {
				$.with_json(response, function(data) {
					$($this.attr('replace'), $this.attr('context')).replaceWith(data);
				});
				
				form.data('saving', false);
				$this.text('Update');
				ajax_loader.hide();
			});
		}
		
		return false;
	});
	
	$('#listing_logo_form').ajaxForm({
		beforeSubmit: function() {
			$('.ajax_loader', '#listing_logo_form').show();
		},
		success: function(response) {
			$('#sl-fac-detail').replaceWith(response);
		}
	});
	
	$('.default_logo', '#logo_choices').live('click', function() {
		var img = $(this), index = img.attr('ci');
		img.attr('src', '/images/ui/ajax-loader-lrg.gif').css({ 'height': '88px', 'border-color': '#fff' });
		
		$.post('/clients/'+ $('#client_id').val() +'/listings/'+ $('#listing_id').val(), { authenticity_token: $.get_auth_token(), from: 'uplogo', default_logo: index, _method: 'put' }, function(response) {
			$.with_json(response, function(data) {
				$('#sl-fac-detail').replaceWith(data);
				img.parents('#pop_up').dialog('close').remove();
			});
		});
	});
	
	// trying to refactor functionality for links that open a pop up, eaither a partial, or a post
	$('.open_small_partial').live('click', function() {
		var $this = $(this);
		get_pop_up_and_do({ title: $this.attr('title'), width: 400, height: 275 }, { sub_partial: $this.attr('href') });
		return false;
	});
	
	$('.popup-post').live('click', function() {
		$.getJSON(this.href, function(response) {
			$.with_json(response, function(data) {
				var pop_up = $('<div id="pop_up"></div>');
				pop_up.html(data).dialog(default_pop_up_options({ title: 'Post' }));
				$('')
			});
		});
		
		return false;
	});
	
	$('.ps').live('click', function() {
		var div_to_print = this.rel,
			print_opts = { operaSupport: $.browser.opera };
		
		if ($(this).attr('href') == '#') $(div_to_print).jqprint(print_opts);
		else {
			$.getJSON(this.href, function(response){
				$.with_json(response, function(data){
					var wrap = $(data).appendTo('body'),
						coup = $(div_to_print).clone().appendTo('#print_content');
					
					wrap.jqprint(print_opts, function(){ wrap.remove(); });
				});
			});
		}
		
		return false;
	});
	
}); // END document ready

// jQuery Plugins

// first implemented for the client edit form. turns spans into inputs and submits the data via ajax
$.fn.instantForm = function() {
	return this.each(function(){
		var $this 		= $(this),
			hidden_form = $('form:hidden', this), // a hidden form we use for the authenticity token and to submit via ajax
			submit_btn 	= $('.instant_submit', this),
			client_id 	= hidden_form.attr('id').replace('client_edit_', ''),
			ajax_loader = $('.ajax_loader', $this),
			cancel_btn 	= $('<a href="#" id="cancel_btn">Cancel</a>').hide().appendTo($this);
		
		// serves as the edit mode button and submit button
		submit_btn.click(function(){
			if ($(this).text() == 'Edit') {
				$(this).data('saving', false);
				cancel_btn.fadeIn();
				
				// turn elements with a class of value into an input. use it's rel attr and text for the field name, the rel attr is the relation name, e.g. mailing_address, billing_info. the text is the attr name
				$('.value', $this).each(function(){
					var $self 		= $(this).hide(),
						label_text 	= $self.prev('.label').text().replace(':', '').replace(' ', '_').toLowerCase(),
						field_name	= 'client'+ ($self.attr('rel') ? '['+ $self.attr('rel') +']' : '') +'[' + label_text +']', 
						input 		= $('<input type="text" class="small_text_field '+ label_text +' '+ $self.attr('validate') +'" name="'+ field_name +'" value="'+ $self.text() +'" />');

					input.prependTo($self.parent());
				});
				
				$('.small_text_field', $this).eq(0).focus();
				$(this).text('Save');
				$.bindPlugins(); // so that hinty and formbouncer will work.
				$('.numeric_phone', $this).formatPhoneNum();
				
			} else if ($(this).text() == 'Save' && !$(this).data('saving')) {
				$(this).data('saving', true);
				ajax_loader.show();
				
				// put copies of the inputs into the form so we can serialize it and send the data
				$('input', $this).each(function(){ hidden_form.append($(this).clone()); });
				
				$.post(hidden_form.attr('action'), hidden_form.serialize(), function(response){
					$.with_json(response, function(data){
						$('#owner_info_wrap', $this).replaceWith(data);
						submit_btn.text('Edit');
					});
					
					ajax_loader.hide();
					cancel_btn.fadeOut();
					$(this).data('saving', false);
					
				}, 'json');
			}
			
			return false;
		});
		
		cancel_btn.click(function(){
			$('.small_text_field', $this).remove();
			$('.value', $this).show();
			$(this).fadeOut();
			submit_btn.text('Edit').data('saving', false);
			return false;
		});
	});
}

// NEW CLIENT Workflow (sign up through the add-your-facility page)
var workflow_settings = {
	title		 : 'Add Your Facility',
	nav_id : 'workflow_nav',
	set_slides : true,
	slides : [
		{ 
			div_id  : 'signupstep_2',
			action  : workflow_step2,
			slide_display : 'Found possible listings',
			nav_vis : [
				['next', function(btn, wizard){ btn.text('Next').data('done', false).show() }],
				['skip', 'fadeIn'],
				['back', function(btn, wizard){ btn.show().bind('click', close_pop_up_and_focus_on_fac_name) }] 
			]
		},
		{ 
			div_id  : 'signupstep_3',
			action  : workflow_step3,
			slide_display : 'Contact information',
			nav_vis : [
				['next', function(btn, wizard){ btn.text('Next').data('done', false).show() }],
				['skip', 'fadeOut'],
				['back', function(btn, wizard){ btn.unbind('click', close_pop_up_and_focus_on_fac_name) }]
			],
			validate : function(wizard){ return $('#contact_info_form', wizard.workflow).runValidation().data('valid'); }
		},
		{ 
			div_id  : 'signupstep_4',
			action  : workflow_step4,
			slide_display : 'Review your information',
			nav_vis : [
				['next', function(btn, wizard){ btn.text('Done').data('done', true); }],
				['skip', 'fadeOut'],
				['back', 'fadeIn']
			]
		}
	],
	finish_action : function(wizard){ finish_workflow(wizard) }
};

function close_pop_up_and_focus_on_fac_name(event){
	$('#pop_up').dialog('close');
	$('#client_company', '#new_client').focus();
}

function workflow_step2(wizard) {
	var listings_box = $('.small_listings', arguments[0].workflow);
	
	if (!$('#tab_step_0', wizard.workflow.parent()).hasClass('done')) {
		listings_box.hide();
		var listing_prototype = $('.listing_div', arguments[0].workflow).eq(0).removeClass('hidden').remove();
		$('.found_box p span', wizard.workflow).text(wizard.slide_data[0].data.length); // number of listings returned

		$.each(wizard.slide_data[0].data, function(i){
			var listing = this.listing,
				listing_div = listing_prototype.clone();

			$('.check input', listing_div).val(listing.id);
			$('.num', listing_div).text(i+1);
			$('.listing_title', listing_div).text(listing.title);
			$('.listing_address', listing_div).html('<span class="street_address">'+ listing.address +'</span><br />'+ listing.city +', '+ listing.state +' <span class="zip">'+ listing.zip +'</span>');

			listing_div.attr('id', 'Listing_'+ listing.id).appendTo(listings_box);
		});

		setTimeout(function(){
			listings_box.fadeIn(wizard.settings.fade_speed);
			listing_id = $.get_param_value('listing_id');
			if (listing_id) $('#Listing_'+ listing_id, listings_box).addClass('selected').find(':checkbox[name=listing_id]').attr('checked', true);
		}, 350);
	}
	
	// animate the height, depending on how many potential listing results there are, max 420px
	if (wizard.slide_data[0].data.length < 3) var anim_height = 205;
	else if (wizard.slide_data[0].data.length >= 4)  var anim_height = 420;
	else var anim_height = wizard.slide_data[0].data.length * 105;
	wizard.workflow.animate({ 'height': anim_height +'px' }, 'fast');
}

function workflow_step3() {
	var wizard    = arguments[0],
		addresses = get_checked_listings_addresses(wizard),
		city 	  = $('#listing_city', '#new_client').val(),
		state 	  = $('#listing_state', '#new_client').val(),
		zips	  = get_checked_listings_addresses(wizard, 'zip');
	
	$.setup_autocomplete('#listing_city', wizard.workflow);
	
	if (addresses.length == 1) $('#listing_address', wizard.workflow).val(addresses[0]);
	else $('#listing_address', wizard.workflow).autocomplete({ source: (addresses || []) });
	
	if (zips.length == 1) $('#listing_zip', wizard.workflow).val(zips[0]);
	else $('#listing_zip', wizard.workflow).autocomplete({ source: zips });
	
	$('#listing_city', wizard.workflow).val(city);
	$('#listing_state', wizard.workflow).val(state.toUpperCase());
	
	// bind plugins and change pop_up title
	$('.hintable', wizard.workflow).hinty();
	$('.numeric_phone', wizard.workflow).formatPhoneNum();
	$('.city_state_zip .autocomplete', wizard.workflow).autocomplete();
	
	wizard.workflow.animate({ 'height': '300px' });
	setTimeout(function(){ $('#first_name', wizard.workflow).focus() }, 350);
}

function workflow_step4() { // form data review
	var wizard    = arguments[0],
		review	  = $('#signupstep_4 .left', wizard.workflow).html(''), // reset before filling in again if the user clicked back
		listings  = $('#signupstep_2 .small_listings', wizard.workflow).find('input:checked'),
		info	  = $('#signupstep_3 #contact_info_form', wizard.workflow).find('input'),
		company	  = $('#client_company', '#new_client').val(),
		email 	  = $('#client_email', '#new_client').val();
	
	wizard.form_data.client = {};
	wizard.form_data.mailing_address = {};
	wizard.form_data.client['company'] = company;
	wizard.form_data.client['email'] = email;
	wizard.form_data['authenticity_token'] = $.get_auth_token();
	
	info.each(function() {
		switch (this.name) {
			case 'first_name' 		: wizard.form_data.client['first_name'] 	  = capitalize(this.value); break;
			case 'last_name' 		: wizard.form_data.client['last_name'] 		  = capitalize(this.value); break;
			case 'listing_address' 	: wizard.form_data.mailing_address['address'] = this.value; 	   		break;               
			case 'listing_city' 	: wizard.form_data.mailing_address['city'] 	  = this.value; 	   		break;               
			case 'listing_state' 	: wizard.form_data.mailing_address['state']   = this.value; 	   		break;               
			case 'listing_zip' 		: wizard.form_data.mailing_address['zip'] 	  = this.value; 	   		break;               
			case 'listing_phone' 	: wizard.form_data.mailing_address['phone']   = this.value || ''; 		break;
			case 'wants_newsletter' : wizard.form_data.client[this.name] 	  	  = this.checked; 			break;
		}
	});
	
	var review_html = '<h4>Contact Information:</h4>';
		
	review_html += '<div id="review_contact">';
		review_html += '<p class="name">'+ wizard.form_data.client['first_name'] +' '+ wizard.form_data.client['last_name'] +'</p>';
		if (wizard.form_data.mailing_address['phone'] && wizard.form_data.mailing_address['phone'] != 'Phone Number') review_html += '<p class="phone">'+ wizard.form_data.mailing_address['phone'] +'</p>';
		review_html += '<p class="email">'+ email +'</p>';
		review_html += '<p class="listing_title">'+ titleize(company) +'</p>';
		review_html += '<p class="listing_address">' + 
						wizard.form_data.mailing_address['address'] +'<br />'+ 
						capitalize(wizard.form_data.mailing_address['city']) +', '+ 
						capitalize(wizard.form_data.mailing_address['state']) +' '+ 
						wizard.form_data.mailing_address['zip'] +'</p>';
	review_html += '</div>';
	
	review_html += '<p class="opt_in">'+ (wizard.form_data.client['wants_newsletter'] ? 'Send' : 'Don\'t send') +' me the monthly newsletter.</p>';
	
	if (listings.length > 0) {
		wizard.form_data.listings = [];
		review_html += '<h4>My Listings:</h4><div class="small_listings">';
		
		listings.each(function(i) {
			var title 	= titleize($('#Listing_'+ this.value +' .listing_title', wizard.workflow).text()),
				address = titleize($('#Listing_'+ this.value +' .listing_address', wizard.workflow).html());
			
			wizard.form_data.listings.push(this.value);
			
			review_html += '<div class="listing_div"><div class="left block num">'+ (i+1) +'</div><div class="listing_in">';
			review_html += '<p class="listing_title">'+ title +'</p><p class="listing_address">'+ address +'</p></div></div>';
		});
		
		review_html += '</div>';
	}
	
	review.append(review_html);
	wizard.workflow.animate({ 'height': '435px' }, 'fast');
	setTimeout(function(){ review.fadeIn(wizard.settings.fade_speed) }, 350);
}

function finish_workflow() {
	var wizard = arguments[0],
		next_button = $('.next', arguments[0].workflow);
	
	if (!next_button.data('saving')) {
		next_button.data('saving', true).before('<img src="/images/ui/ajax-loader-facebook.gif" class="ajax_loader" alt="Loading..." />');
		next_button.prev('.ajax_loader').show();

		$.post('/clients', wizard.form_data, function(response){
			$.with_json(response, function(){
				// redirect to home page to show the flash message
				window.location = '/';
			});
			
			next_button.prev('.ajax_loader').hide().data('saving', false);
			$('.ui-autocomplete').remove();
		});
	}
	
	return false;
}

function get_checked_listings_addresses(wizard, address_part) {
	if (typeof address_part == 'undefined') var address_part = 'street_address';
	var checked = $('#signupstep_2 :checkbox:checked', wizard.workflow),
		addresses = [];
	
	checked.each(function(){
		var part = $('.'+ address_part, '#Listing_'+ this.value).text();
		addresses.push(part);
	});
	
	return addresses;
}


function preload_us_map_imgs() {
	var states = ["al", "ak", "az", "ar", "ca", "co", "ct", "de", "fl", "ga", "hi", "id", "il", "in", "ia", "ks", "ky", "la", "me", "md", "ma", "mi", "mn", "ms", "mo", "mt", "ne", "nv", "nh", "nj", "nm", "ny", "nc", "nd", "oh", "ok", "or", "pa", "ri", "sc", "sd", "tn", "tx", "ut", "vt", "va", "wa", "wv", "wi", "wy"];
	$.each(states, function(){
		var img = new Image();
		img.src = '/images/ui/storagelocator/us_map/'+ this +'.png';
	});
}