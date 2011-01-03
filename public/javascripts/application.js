$ = jQuery;
$(document).ready(function() {
	if ($('body').hasClass('home')) $('#dock').jqDock({ size: 60, attenuation: 400, fadeIn: 1000 });
	else $('#dock').jqDock({ size: 50, attenuation: 400, fadeIn: 1000 });
	
/******************************************* PAGE SPECIFIC BEHAVIOR *******************************************/

	$.translate_with(translations);
	
	// front page
	$('#search_submit, #search_submit2').click(function() {
		// the live submit handler in formbouncer doesn't seem to work on the search form
		// temporary workaround...
		return $(this).parents('form').runValidation().data('valid');
	});
	
	// ajaxify the login form and forgot password link
	$('#login_link').click(function() {
		var $this = $(this);
		if ($this.hasClass('active')) return false;

		$this.addClass('active');
		var pop_up = $('#pop_up_box').css({ top: '50px', right: '20px' });

		pop_up.fadeIn();
		$('input[type=text]', pop_up).eq(0).focus();
		$.bindPlugins();
		
		// TODO: this is a quickfix, find out why in IE the login box closes even when clicking inside of it, good luck.
		if (!$.browser.msie) {
			// close login box when user clicks outside of it
			$(document).click(function(e) {
				if ($(e.target).parents('#pop_up_box').length == 0) {
					pop_up.fadeOut(300, function() { 
						$('#login_link').removeClass('active');
						pop_up.hide();
					});
				}
			});
		}
		
		return false;
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
						$('#pop_up_box').fadeOutRemove();
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
	
	// map pop up
	var map_nav_btn = $('#map_nav_btn');
	if (map_nav_btn.length > 0) {
		$.preload_us_map_imgs();
		
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
					var city_name = $('#city_name', '#map_step2');
					if (city_name.length > 0) city_name.text('Looking for '+ $(this).text() +', '+ wizard.slide_data[1].data.state +'...')
					else $('#map_step2', '#map_nav').append('<p id="city_name">Looking for '+ $(this).text() +', '+ wizard.slide_data[1].data.state +'...</p>');
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
	
	$('#advanced_opts', '#pages_controller.home').hide();
	
	// Cities pages
	$('.storage_in_city', '#cities_list').css('width', '23%');
	$('.storage_in_city span', '#cities_list').hide();
	
	// affiliate ads 
	var aff_scroll = $('#aff_scroll');
	if (aff_scroll.length) {
		$('.items', aff_scroll).width($('.usssl_adp', aff_scroll).length * 160);
		aff_scroll.scrollable({ speed: 1500, circular: true, easing: 'swing' });
	}
	
	// storage tips page
	var tips_head = $('#tips-head'); 
	if (tips_head.length > 0) {
		new GreyShow({
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
						{ id : 'bub2', action: 'fadeIn', speed: 1000, delay: 6000, callback: function(o, s){ o.html('<blockquote>Online rentals are so convenient</blockquote>').children().hide().fadeIn('slow') } }
					],
					end : function(s) { s.gotoSlide(2); }
				},
				{
					objects : [
						{ id : 'bg2', action: 'fadeIn', speed: 500, delay: 500 },
						{ id : 'bub3', action: 'fadeIn', speed: 1000, delay: 8000, callback: function(o, s){ o.html('<blockquote>I was able to find a really great deal!</blockquote>').children().hide().fadeIn('slow') } }
					],
					end : function(s) { s.gotoSlide(0); }
				}
			]
		}).start();
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
	
	if ($.on_page([['locator, home', 'listings']])) {
		var main_map = $('#main_map');
		
		$('#top_map_btn').live('click', function(){
			var $this = $(this),
				location = $this.attr('rel').split(','),
				lat = parseFloat(location[0]),
				lng = parseFloat(location[1]);

			if ($this.text() == 'Show Map') {
				$.cookie('mo', true, { expires: 30 });
				$('span', $this).text('Hide Map');
				main_map.slideDown();
			} else {
				$.cookie('mo', null);
				$('span', $this).text('Show Map');
				main_map.slideUp();
			}

			// center the map the first time it opens
			if (main_map.is(':visible')) setTimeout(function(){
				Gmap.checkResize();
				Gmap.setCenter(new GLatLng(lat, lng), 12);
			}, 300);
		});
		
		if (!$.cookie('mo')) {
			$.cookie('mo', true);
			$.open_map(main_map);
		}
	}
	
	// New Permissions
	if ($.on_page([['new', 'permissions, roles']])) {
		$('a.add_link', '.partial_addable').click();
	} // END New Permissions
	
	// user tips page
	$('a', '#tips_sort').live('click', function() {
		$('a', '#tips_sort').removeClass('up').removeClass('down');
		var $this = $(this),
			sort_what = $this.text(),
			tips = $('.blog-lock', '#tips-wrap');
		
		switch (sort_what) {
			case 'Newest' : $.sort_tips($this, tips, function(a, b) {
					var a1 = parseInt($('.updated_at', a).text()),
						b1 = parseInt($('.updated_at', b).text());
					
					return a1 > b1 ? (tip_sort_inverse ? 1 : -1) : (tip_sort_inverse ? -1 : 1);
				});
			break;
			case 'Rating' : $.sort_tips($this, tips, function(a, b) {
					var a1 = $('.show-value', a).width(),
						b1 = $('.show-value', b).width();
					
					// this one should sort down when the values are equal since most of the ratings are the same number
					return a1 == b1 ? -1 : a1 > b1 ? (tip_sort_inverse ? -1 : 1) : (tip_sort_inverse ? 1 : -1);
				});
			break;
			case 'Title' : $.sort_tips($this, tips, function(a, b) {
					var a1 = $('h3 a', a).text(),
						b1 = $('h3 a', b).text();
						
					return a1 > b1 ? (tip_sort_inverse ? -1 : 1) : (tip_sort_inverse ? 1 : -1);
				});
			break;
		}
		
		tip_sort_inverse = !tip_sort_inverse;
		return false;
		
		/* TODO: do serverside sorting when we have more tips
		get_partial_and_do({ partial: 'views/partials/tips', sort_by: this.href.replace('#', ' ') }, function(response) {
			$.with_json(response, function(partial) {
				$('#tips_view').replaceWith(partial);
			});
		});*/
	});
	
	$('input', '#search_tips').keyup(function() {
		var parent = function() { return $(this).parents('.blog-lock') };
		$('.tip_in > h3 a, .tip_in > div', '.blog-lock').search(this.value, 'by substring', { remove: parent });
	});
	
	$('#create_tip').submit(function() {
		var form = $(this).runValidation(),
			ajax_loader = $.new_ajax_loader('after', $('input[type=submit]', form)).show();
		
		if (form.data('valid') && !form.data('saving')) {
			form.data('saving', true);
			
			$.post(form.attr('action'), form.serialize(), function(response) {
				$.with_json(response, function(data) {
					$('<div id="pop_up"><div id="tip_created">' + data +'</div></div>').dialog(default_pop_up_options({
						title: 'Your Tip Was Submitted',
						height: 'auto',
						width: '300px',
						modal: true
					}));
					
					form.parent().hide();
				});
				
				ajax_loader.hide();
				form.data('saving', false);
			}, 'json');
		}
		
		return false;
	});
	
	// build the addThis sharing buttons for each tip
	var sharing_buttons = ['email', 'facebook', 'twitter', 'digg', 'print'],
		addthis_main_btn = '<a href="http://www.addthis.com/bookmark.php?v=250&username=mastermindxs" class="addthis_button_compact">Share</a><span class="addthis_separator">|</span>';
	$('.tip_in', '#tips-wrap').each(function() {
		if (typeof addthis == 'object') {
			var share_wrap = $('.addthis_toolbox', this).append(addthis_main_btn),
				tip_link = $('h3 a', this),
				share_url = tip_link.attr('href'),
				share_title = tip_link.text();
			
			$.each(sharing_buttons, function() {
				share_wrap.append('<a class="addthis_button_'+ this +'"></a>');
			});
			
			addthis.toolbox(share_wrap[0], { 'data_track_clickback': true }, { url: share_url, title: share_title });
		}
	});
	
	$('.facebook_share', '#tips-wrap').live('click', function() {
		var tip = $(this).parents('.tip_in'),
			link = $('h3 a', tip), u = encodeURIComponent(link.attr('href')), t = encodeURIComponent(link.text());
		
		window.open('http://www.facebook.com/sharer.php?u='+ u, 'sharer', 'toolbar=0,status=0,width=626,height=436');
		return false;
	});
	
	$('#form_comments', '#column_5').submit(function() {
		var form = $(this).runValidation(),
			ajax_loader = $.new_ajax_loader('before', $('input[type=submit]', form));
		
		if (form.data('valid') && !form.data('saving')) {
			form.data('saving', true);
			ajax_loader.show();
			
			$.post('/comments/contact', form.serialize(), function(response) {
				$.with_json(response, function(data) {
					form.html(data);
				});
				
				ajax_loader.hide();
				form.data('saving', false);
			});
		}
		
		return false;
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
					get_pop_up_and_do({ 'title': pop_up_title, 'height': pop_up_height, modal: true, width: '795px' }, { 'sub_partial': sub_partial }, function(pop_up) { // prepping step 2
						var wizard = new GreyWizard($('#workflow_steps', pop_up), workflow_settings);
						
						if (data.length > 0) { // we found matching listings, start on the first step of the workflow
							workflow_settings.slides[0].data = data;
							wizard.begin_workflow_on(0);
							
						} else wizard.begin_workflow_on(1);
						
						signup_form.data('saving', false);
					});
					
					ajax_loader.hide();
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
			chk_avail.text('Checking').data('checking', true);
			
			$.getJSON('/ajax/find?model=Client&by=email&value='+ email, function(response) {
				$.with_json(response, function(data) {
					if (data.length) {
						email_input.addClass('invalid').focus();
						chk_avail.text('Already Taken').attr('title', 'You may have already signed up in the past. Try logging in.').removeClass('avail').addClass('not_avail').show();
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
			var dont_hide = $(this).attr('rel'), 
				hide_these = $('.hideable'),
				user_hints = $('.user_hint.open');
			
			user_hints.filter('.user_hint[data-rel!='+ dont_hide +']').slideUp();
			user_hints.filter('.user_hint[data-rel='+ dont_hide +']:hidden').slideDown();
			
			if (dont_hide) {
				hide_these.each(function(){
					if (this.id != dont_hide) $(this).slideUp();
					else $(this).slideDown();
				});
			} else {
				hide_these.slideDown();
				user_hints.slideDown();
			}

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
								nav_vis : [['back', 'hide'], ['next', function(btn, wizard) { btn.text('Next').data('done', false).fadeOut(); }]],
								action	: function(wizard) {
									$('#issn_status_option a', '#issnstep_1').unbind('click').click(function(){
										wizard.next();
										return false;
									});
									$('#slide_nav').remove();
								}
							},
							{ 
								pop_up_title : 'Grant Access',
								div_id  : 'issnstep_2',
								nav_vis : [['back', 'fadeIn'], ['next', function(btn, wizard){ btn.text('Done').data('done', true).fadeIn(); }]],
								action	: function(wizard) {
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
							}
						],
						finish_action: 'close'
					}).begin_workflow_on(0);
				});
			}
			
			return false;
		});
		
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
						var box = $(data).append('<a class="close_new_unit" href="#">X</a>');

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

		$.updateModel('/user_hints/'+ placement_id +'/'+ btn.attr('rel'), { model: 'UserHintPlacement' }, function(data) {
			if (btn.attr('rel') == 'hide') {
				hint.slideUp(900).removeClass('open').addClass('hide');
				hint.children().fadeOut(600);
			} else {
				hint.slideDown(900).removeClass('hide').addClass('open');
				hint.children().fadeIn(1200);
			}
				
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
				listing_id = listing.attr('id').replace('Listing_', '');
			
			if (listing_id.length) delete_client_listing(listing_id);
			else listing.slideUpRemove();
			
			return false;
		});
		
		$('.delete_link', '#client_listing_box').click(function() {
			var listing_id = $(this).parents('.listing').attr('id');
			delete_client_listing(listing_id);
			
			return false;
		});
		
		function delete_client_listing(listing_id) {
			$.greyConfirm('Are you sure you want to delete this facility and all information associated with it?', function() {
				var ajax_loader = $('.ajax_loader', '#ov-units-head').show();
				
				$.post('/clients/'+ $('#client_id').text() +'/listings/'+ listing_id.replace('Listing_', '') +'/disable', { authenticity_token: $.get_auth_token() }, function(response) {
					$.with_json(response, function(data) {
						$('#Listing'+ listing_id, '#ov-units').slideUpRemove();
					});
					
					ajax_loader.hide();
				});
			});
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
	
	// the forms in the listing detail edit page
	$('.edit_listing').submit(function() {
		var form = $(this).runValidation(),
			context = form.parent(),
			btn = $('.save', form),
			ajax_loader = $('.ajax_loader', form);
		
		if (form.data('valid') && !form.data('saving')) {
			form.data('saving', true);
			ajax_loader.show();
			$.disable_submit_btn(btn);
			
			$.post(form.attr('action'), form.serialize(), function(response) {
				$.with_json(response, function(data) {
					if (data) $('#'+ form.attr('data-target')).html(data);
						
					var success_msg = $('<span class="success_msg right">Saved!</span>');
					$('input[type=submit]', context).after(success_msg);

					setTimeout(function() {
						success_msg.fadeOutRemove(1000);
					}, 3000);
				});
				
				$.activate_submit_btn(btn);
				ajax_loader.hide();
				form.data('saving', false);
			}, 'json');
		}
		
		return false;
	});
	
	$('#tracking_num_req', '#tab1').live('click', function() {
		var $this = $(this),
			ajax_loader = $.new_ajax_loader('after', $this).show();
		
		get_pop_up_and_do({ title: 'Request Tracked Number', modal: true }, { sub_partial: '/listings/tracking_request', model: 'Listing', id: $('#listing_id').val() }, function(pop_up) {
			$('.numeric_phone', pop_up).formatPhoneNum();
		});
	});
	
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
			
			$('.day_closed', context).attr('checked', true);
			$('select[rel=opening]', context).val('12:00 am');
			$('select[rel=closing]', context).val('11:30 pm');
		} else {
			$('.day_closed', context).each(function(){
				var check = $(this);
				
				$('.day_closed', context).attr('checked', false);
				
				if (check.data('was_checked') && !check.is(':checked')) {
					check.attr('checked', true);
					$('select, input[type=hidden]', check.parent()).attr('disabled', false);
				}
			});
		}
	});
	
	$('.all_day_check', '#hours').each(function() {
		$this = $(this);
		if ($this.is(':checked'))
			$this.change()
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
	
	$('#save_hours', '#hours').click(function(){
		var $this = $(this),
			form = $this.parents('#hours').find('form'),
			ajax_loader = $('.ajax_loader', '#hours');
		
		if (!form.data('saving')) {
			form.data('saving', true);
			ajax_loader.show();
			$.disable_submit_btn($this);
			
			$.post(form.attr('action'), form.serialize(), function(response) {
				$.with_json(response, function(data){
					$this.after('<span class="success_msg">Saved!</span>');
					setTimeout(function(){ $('.success_msg', '#hours').fadeOutRemove(1000); }, 3000);
				});
				
				$.activate_submit_btn($this);
				form.data('saving', false);
				ajax_loader.hide();
			}, 'json');
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
					thumb_img.after('<a href="/listings/'+ data.listing_id +'/pictures/'+ data.id +'" class="delete_link right">Delete</a>');
					
					if (image) image.attr('src', data.image);
					
					thumb_img.trigger('mouseover');
				});
			}
		});
	});
	
	// CLIENT billing info and mailing address
	$('#client_edit_contact').live('click', function() {
		var $this = $(this),
			cancel_link = $('<a class="cancel_link iconOnly16 right" style="margin-top:13px;" title="Cancel Editing">Cancel</a>'),
			wrap = $('#owner_info_wrap', $this.parent().parent()),
			ajax_loader = $.new_ajax_loader('before', $this);

		if ($this.text() == 'Edit') {
			ajax_loader.show();
			
			$.getJSON($this.attr('href'), function(response) {
				$.with_json(response, function(data) {
					$this.text('Save').after(cancel_link);
					wrap.hide().after(data);
					$('.numeric_phone', wrap.parent()).formatPhoneNum();
					$('.hintable', wrap.parent()).hinty();
					$('.auto_next', wrap.parent()).autoNext();
				});
				
				ajax_loader.fadeOutRemove('fast');
			});
			
		} else if ($this.text() == 'Save') {
			var form = $('#edit_info', wrap.parent()).runValidation();
			
			if (!$this.data('saving') && form.data('valid')) {
				$this.data('saving', true);
				$('.cancel_link', $this.parent()).remove();
				ajax_loader.show();
				
				$.post(form.attr('action'), form.serialize(), function(response) {
					$.with_json(response, function(data) {
						$this.text('Edit').after('<span class="success_msg">Saved!</span>');
						wrap.show().html(data);
						form.remove();
						
						setTimeout(function() {
							$('.success_msg', $this.parent()).fadeOutRemove(1000);
						}, 3000);
					});
					
					$this.data('saving', false);
					ajax_loader.fadeOutRemove('fast');
				});
			}
		}
		
		cancel_link.click(function() {
			$('#edit_info').remove();
			$('#owner_info_wrap').show();
			$(this).fadeOutRemove(300);
			$('#client_edit_contact').text('Edit');
			return false;
		});
		
		return false;
	});
	
	var fac_photo_show = $('#sl-photos');
	if (fac_photo_show.length > 0) {
		var imgs = $('img:not(.main_pic)', fac_photo_show), count = 0;
		
		$.setInterval(function() {
			var index = count % imgs.length;
			$(imgs[index]).trigger('mouseover');
			count++;
		}, 7000);
	}
	
	// change main_pic when thumb is hovered
	$('#sl-tabs-pict-gall img, #sl-photos img').live('mouseover', function(){
		if ($(this).hasClass('loading')) return false;
		
		var main_pic = $('#sl-tabs-pict .big-pic, #sl-photos .main_pic');
		if (main_pic.length == 0) return false;
		
		$('img', '#sl-photos #previews, #sl-tabs-pict-gall').removeClass('active');
		var thumb = $(this),
			new_src = thumb.attr('src').replace('/thumb_', '/medium_');
		
		thumb.addClass('active');
		main_pic.attr('src', new_src).attr('alt', thumb.attr('alt'));
	});
	
	$('.delete_link', '#sl-tabs-pict').live('click', function(){
		var $this = $(this);
		
		if (!$this.data('deleting')) $.greyConfirm('Are you sure you want to delete this picture?', function() {
			$this.data('deleting', true).text('Deleting...');
			
			var img = $this.prev('img'),
				id = img.attr('id').replace('Picture_', '');

			$.post($this.attr('href'), { _method: 'delete', authenticity_token: $.get_auth_token() }, function(response){
				$.with_json(response, function(data){
					if (img.hasClass('active'))
						$('img:not(#'+ img.attr('id') +')', '#sl-tabs-pict').trigger('mouseover');
					
					if ($('img', '#sl-tabs-pict-gall').length == 1)
						$('.big-pic', '#sl-tabs-pict').eq(0).fadeOutRemove(900);
						
					$this.parent().fadeOutRemove(600);
				});
			}, 'json');
		});
		
		return false;
	});
	
	$('#account_home_link').click(function() {
		// for some reason the stats_graph div was getting a width of 400px when the page loaded with it hidden (navigated from the listing edit page through one of the client option links)
		$('#stats_graph').css('width', '700px');
		init_stats_graph();
	});
	
	$('.auto_change', '#ov-reports-cnt').change(function(){
		$('#stats_graph').children().fadeTo('slow', .5);
		init_stats_graph({ months_ago : this.value, force: true });
	});
	
	function init_stats_graph(options) {
		if (typeof options == 'undefined') var options = {}
		var stats_graph = $('#stats_graph'),
			days_ago 	= options.days_ago 	 || 0,
			months_ago 	= options.months_ago || 1,
			years_ago 	= options.years_ago  || 0,
			force 		= options.force 	 || false;
		
		if (stats_graph.length > 0) {
			stats_graph.addClass('loading');

			var issn_enabled = $('input#issn_enabled').val() == 'false' ? false : true,
				stats_models = 'clicks,impressions,'+ (issn_enabled ? 'rentals' : 'info_requests'),
				d = new Date(), // getMonth returns 0-11
				end_date = new Date(d.getFullYear(), d.getMonth(), d.getDate()+1),
				start_date = new Date((d.getFullYear() - years_ago), (d.getMonth() - months_ago), (d.getDate() - days_ago)); // month in the past

			$.getJSON('/ajax/get_client_stats?start_date='+ start_date +'&end_date='+ end_date +'&stats_models='+ stats_models +'&client_id='+ $('#client_id').text(), function(response){
				$.with_json(response, function(data) {
					$.jqplot.preInitHooks.push(function() {
						stats_graph.children().remove();
					});
					
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
					        { label: '&nbsp;'+ (issn_enabled ? 'Rentals' : 'Requests'), lineWidth: 2, color: '#339933', markerOptions: { style: 'circle', color: '#339933' } }
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

	$('.predef_special', '#toggle_specials').click(function() {
		var $this = $(this).toggleClass('checked'), form = $this.parents('form'), id = $this.children('input:hidden').val();
		
		$.post(form.attr('action'), { 'predefined_special_id': id, 'toggle': $this.hasClass('checked') }, function(response) {
			$.with_json(response, function(data) {
				
			});
		});
	});
		
	// TODO: refactor all button events that do ajax calls
	// first refactor: save buttons, they have a form to submit activerecord models and return a form partial to replace html with updated content
	$('.save_btn').click(function(){
		var $this = $(this),
			form = $('form', $this.attr('context')).runValidation(), // the context the form is in
			ajax_loader = $($this.attr('loader')); // the context the ajax_loader is in
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
	
	$('#logo_form').live('submit', function() {
		var form = $(this),
			btn = $('.save', form);
		
		form.ajaxSubmit({
			beforeSubmit: function() {
				$.disable_submit_btn(btn);
				$('.ajax_loader', '#logo_form').show();
			},
			target: '#flogo'
		});
		
		return false;
	});
	
	$('.default_logo', '#logo_choices').live('click', function() {
		var img = $(this), index = img.attr('data-ci');
		img.attr('src', '/images/ui/ajax-loader-lrg.gif').css({ 'height': '44px', 'border-color': '#fff' });
		
		$.post('/clients/'+ $('#client_id').val() +'/listings/'+ $('#listing_id').val(), { authenticity_token: $.get_auth_token(), from: 'uplogo', default_logo: index, _method: 'put' }, function(response) {
			$('#flogo', '#tab1').html(response);
		});
	});
	
	// trying to refactor functionality for links that open a pop up, eaither a partial, or a post
	$('.open_small_partial').live('click', function() {
		var $this = $(this);
		get_pop_up_and_do({ title: $this.attr('title'), width: 400, height: 248 }, { sub_partial: $this.attr('href') }, function(pop_up) {
			pop_up.css('width', '400px')
		});
		return false;
	});
	
	$('.popup-post').live('click', function() {
		var $this = $(this);
		
		$.getJSON(this.href, function(response) {
			$.with_json(response, function(data) {
				var pop_up = $('<div id="pop_up"></div>');
				pop_up.html(data).dialog(default_pop_up_options({ title: $this.attr('title'), width: '400px' }));
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
	
	$('#resend_link', '#signupstep_5').live('click', function() {
		var $this = $(this),
			ajax_loader = $.new_ajax_loader('after', $this.parent());
		
		if (!$this.data('sending')) {
			$this.data('sending', true);
			ajax_loader.show();
			
			$.getJSON($this.attr('href'), function(response) {
				$.with_json(response, function(data) {
					$this.parent().after('<p class="success_msg">The activation email has been resent.</p>');
				});
				
				ajax_loader.hide();
				$this.data('sending', false);
			});
		}
		
		return false;
	});
	
}); // END document ready

// NEW CLIENT Workflow (sign up through the add-your-facility page)
var workflow_settings = {
	title		 : 'Add Your Facility',
	nav_id : 'workflow_nav',
	set_slides : false,
	width : 753,
	slides : [
		{
			div_id  : 'signupstep_2',
			action  : workflow_step2,
			nav_vis : [
				['next', function(btn, wizard) { btn.text('Next').data('done', false).show() }],
				['skip', function(btn, wizard) { btn.fadeIn().bind('click', ensure_no_listings_checked) }],
				['back', function(btn, wizard) { btn.show().bind('click', close_pop_up_and_focus_on_fac_name) }]
			]
		},
		{ 
			div_id  : 'signupstep_3',
			action  : workflow_step3,
			nav_vis : [
				['next', function(btn, wizard) { btn.text('Next').data('done', false).show() }],
				['skip', 'fadeOut'],
				['back', function(btn, wizard) { btn.unbind('click', close_pop_up_and_focus_on_fac_name) }]
			],
			validate : function(wizard){ return $('#contact_info_form', wizard.workflow).runValidation().data('valid'); }
		},
		{ 
			div_id  : 'signupstep_4',
			action  : workflow_step4,
			nav_vis : [
				['next', function(btn, wizard) { btn.text('Submit').data('done', false); }],
				['skip', 'hide'],
				['back', 'fadeIn']
			],
			validate : function(wizard) {
				return $('#terms_use', wizard.workflow).runValidation().data('valid');
			}
		},
		{ 
			div_id  : 'signupstep_5',
			action : workflow_step5,
			nav_vis : [
				['next', function(btn, wizard){ btn.text('Done').data('done', true); }],
				['skip', 'hide'],
				['back', 'fadeIn']
			]
		}
	],
	finish_action : function(wizard){ 
		wizard.workflow.parent().dialog('destroy').remove();
		$('#new_client')[0].reset();
		$('#chk_avail, .ajax_loader', '#new_client').hide();
	}
};

function ensure_no_listings_checked() {
	$('input[name=listing_id]:checked', '#signupstep_2').attr('checked', false).parents('.selected').removeClass('selected');
}

function close_pop_up_and_focus_on_fac_name(event){
	$('#pop_up').dialog('close');
	$('#client_company', '#new_client').focus();
}

function workflow_step2(wizard) {
	var listings_box = $('.small_listings', arguments[0].workflow);
	
	if (listings_box.children().length == 0) {
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
			var listing_id = $.get_param_value('listing_id');
			
			if (listing_id) 
				$('#Listing_'+ listing_id, listings_box).addClass('selected').find(':checkbox[name=listing_id]').attr('checked', true);
				
		}, 350);
	}
	
}

function workflow_step3(wizard) {
	var addresses = $.get_checked_listings_addresses(wizard),
		city 	  = $('#listing_city', '#new_client').val(),
		state 	  = $('#listing_state', '#new_client').val(),
		zips	  = $.get_checked_listings_addresses(wizard, 'zip');
	
	$.setup_autocomplete('#listing_city', wizard.workflow);
	
	if (addresses.length == 1) $('#listing_address', wizard.workflow).val(capitalize_addr(addresses[0]));
	else if (addresses.length > 1) $('#listing_address', wizard.workflow).autocomplete({ source: capitalize_addr(addresses || []) });
	
	if (zips.length == 1) $('#listing_zip', wizard.workflow).val(zips[0]);
	else if (zips.length > 1) $('#listing_zip', wizard.workflow).autocomplete({ source: zips });
	
	$('#listing_city', wizard.workflow).val(capitalize(city));
	$('#listing_state', wizard.workflow).val(state.toUpperCase());
	
	// bind plugins and change pop_up title
	$('.hintable', wizard.workflow).hinty();
	$('.numeric_phone', wizard.workflow).formatPhoneNum();
	$('.city_state_zip .autocomplete', wizard.workflow).autocomplete();
	
	setTimeout(function(){ $('#first_name', wizard.workflow).focus() }, 350);
}

function workflow_step4() { // form data review
	var wizard    = arguments[0],
		review	  = $('#signupstep_4 .inner', wizard.workflow).html(''), // reset before filling in again if the user clicked back
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
			case 'listing_city' 	: wizard.form_data.mailing_address['city'] 	  = capitalize(this.value);	break;               
			case 'listing_state' 	: wizard.form_data.mailing_address['state']   = this.value; 	   		break;               
			case 'listing_zip' 		: wizard.form_data.mailing_address['zip'] 	  = this.value; 	   		break;               
			case 'listing_phone' 	: wizard.form_data.mailing_address['phone']   = this.value || ''; 		break;
			case 'wants_newsletter' : wizard.form_data.client[this.name] 	  	  = this.checked; 			break;
		}
	});
	
	var review_html = '<h4>Contact Information:</h4>';
	
	review_html += '<div id="review_contact">';
		review_html += '<div class="label">Company Name:</div> <p class="listing_title">'+ titleize(company) +'</p>';
		review_html += '<div id="address" class="label">Company Address:</div> <p class="listing_address">' + 
							wizard.form_data.mailing_address['address'] +'<br />'+ 
							capitalize(wizard.form_data.mailing_address['city']) +', '+ 
							capitalize(wizard.form_data.mailing_address['state']) +' '+ 
							wizard.form_data.mailing_address['zip'] +'</p>';
		review_html += '<div id="name" class="label">Name:</div> <p class="name">'+ wizard.form_data.client['first_name'] +' '+ wizard.form_data.client['last_name'] +'</p>';
		
		if (wizard.form_data.mailing_address['phone'] && wizard.form_data.mailing_address['phone'] != 'Phone Number') 
			review_html += '<div class="label">Phone:</div> <p class="phone">'+ wizard.form_data.mailing_address['phone'] +'</p>';
			
		review_html += '<div class="label">Email:</div> <p class="email">'+ email +'</p>';
	review_html += '</div>';
	
	review_html += (wizard.form_data.client['wants_newsletter'] ? '<p class="opt_in">Send' : '<p class="opt_out">Don\'t send') +' me the monthly newsletter.</p>';
	
	if (listings.length > 0) {
		$('.attribute_fields .listing,.attribute_fields .map', review.next()).remove();
		wizard.form_data.listings = [];
		review_html += '<h4 id="listings">My Listings:</h4><div class="small_listings">';
		
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
	
	setTimeout(function(){ review.fadeIn(wizard.settings.fade_speed) }, 350);
}

function workflow_step5(wizard) {
	var nav_btns = $('.button', wizard.nav_bar).hide();
	$('#signup_processing .ajax_loader', wizard.workflow).fadeIn();
	
	$.post('/clients', wizard.form_data, function(response) {
		$.with_json(response, function(data) {
			nav_btns.filter('.next').show();
			$('#signup_processing', wizard.workflow).hide();
			$('#signup_complete', wizard.workflow).show();
			$('#resend_link', wizard.workflow).attr('href', '/resend_activation/'+ data.activation_code);
		});
	}, 'json');
}

// HELPERS

$.get_checked_listings_addresses = function(wizard, address_part) {
	if (typeof address_part == 'undefined') var address_part = 'street_address';
	var checked = $('#signupstep_2 :checkbox:checked', wizard.workflow),
		addresses = [];
	
	checked.each(function(){
		var part = $('.'+ address_part, '#Listing_'+ this.value).text();
		addresses.push(part);
	});
	
	return addresses;
}

$.preload_us_map_imgs = function() {
	var states = ["al", "ak", "az", "ar", "ca", "co", "ct", "de", "fl", "ga", "hi", "id", "il", "in", "ia", "ks", "ky", "la", "me", "md", "ma", "mi", "mn", "ms", "mo", "mt", "ne", "nv", "nh", "nj", "nm", "ny", "nc", "nd", "oh", "ok", "or", "pa", "ri", "sc", "sd", "tn", "tx", "ut", "vt", "va", "wa", "wv", "wi", "wy"];
	$.each(states, function(){
		var img = new Image();
		img.src = '/images/ui/storagelocator/us_map/'+ this +'.png';
	});
}

// uses the jquery plugin sortElement
var tip_sort_inverse = false;
$.sort_tips = function(sort_link, tips, sortFunc) {
	sort_link.addClass(tip_sort_inverse ? 'down' : 'up');
	
	tips.sortElements(function(a, b) {
		return sortFunc(a, b);

	}, function() {
		return $(this).children('.tip_in')[0];
	});
}

var translations = [
	{
		page : '.spanish',
		elements : [
			{
				element 	: '.virtual_form #comment_submit',
				method 		: 'val', // val, text, or html
				translation : 'Enviar Mensaje'
			},
			{
				element 	: '#footer_top .wrapper',
				method 		: 'text',
				translation : 'Encuentre una unidad de almacenamiento en cualquier lugar y en cualquier momento!'
			},
			{
				element 	: '#title h1',
				method 		: 'text',
				translation : 'Encuentré, ahorré y alquilé almacenamiento en cualquier momento.'
			},
			{
				element 	: '#aff-box p',
				method 		: 'html',
				translation : '<strong>Socios Afiliados</strong> - Obtener grandes ofertas y ahorre en su próximo alquiler almacenamiento con uno de nuestros socios afiliados.'
			},
			{
				element 	: '#social-media p',
				method 		: 'html',
				translation : '<strong>Compartir esta pagina</strong> - Tenemos ofertas increíbles a través de nuestras páginas de la red social y empresarial.'
			},
			{
				element 	: '#top_cities p strong',
				method 		: 'text',
				translation : 'Las Ciudades Mas Populares De Almacenamiento'
			}
		]
	}
]

$.translate_with = function(translations) {
	$.each(translations, function() {
		var page = this.page;
		
		$.each(this.elements, function() {
			var element = $(this.element, page);
			
			if (element.length > 0)
				element[this.method](this.translation);
		});
	});
}
