/***************** UTILITY FUNCTIONS *****************/
$ = jQuery;
$(document).ready(function() {
	if ($('body').hasClass('home')) $('#dock').jqDock({ size: 60, attenuation: 400, fadeIn: 1000 });
	else $('#dock').jqDock({ size: 50, attenuation: 400, fadeIn: 1000 });
	
/******************************************* PAGE SPECIFIC BEHAVIOR *******************************************/
	
	// front page
	
	// ajaxify the login form and forgot password link
	$('#login_link').click(function() {
		var $this = $(this);
		if ($this.hasClass('active')) return false;
		
		$this.addClass('active');
		var pop_up = $('#pop_up_box');
		
		if (pop_up.length == 1) pop_up.fadeIn();
		else {
			pop_up = $('<div id="pop_up_box"></div>').css({ top: '50px', right: '20px' });

			pop_up.appendTo('body').load('/login', function(response, status) {
				if (status == 'success') {
					pop_up.fadeIn();
					$('input[type=text]', pop_up).eq(0).focus();
					$.bindPlugins();

				} else alert(response);
			});
		}
		
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
	
	$('#forgot_pass_link').live('click', function() {
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
		$size_img = $('img', $size_picker);
		
	$('option', '#storage_size').mouseover(function(){
		var $this = $(this),
			size  = this.value,
			new_img = $('<img src="/images/ui/storagelocator/unit_sizes/'+ size +'-sm.png" alt="'+ size +'" />');
		
		if ($size_img.attr('src').split('.')[0].replace('/images/ui/storagelocator/unit_sizes/', '').replace('-sm', '') != size) {
			$size_img.fadeOut(100, function(){
				$size_picker.html(new_img)
				new_img.hide().fadeIn(120);
				$size_img = $('img', $size_picker);
				
				if (new_img.width() > 183) new_img.width(183);
			});
		}
	});
	
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
							$.handle_json_response(response, function(data){
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
	
	// Simple animated slideshow, takes an options object which defines the slides, actions and slide objects, see below: tips_show
	var GreyShow = function(options) {
		var self = this;
		this.context 	= options.context;
		this.slides  	= options.slides;
		this.delay 	 	= options.delay;
		this.num_slides = options.slides.length;
		this.time_int 	= 0;
		
		this.start = function() {
			self.current = 0;
			self.startSlide();
		}
		
		this.startSlide = function() {
			if (typeof self.slides[self.current].start == 'function') self.slides[self.current].start.call(this, self);
			
			self.hidePrevSlide();
			self.slide_objects = self.slides[self.current].objects;
			self.current_object = 0;
			self.runObject(self.slide_objects[0]);
		}
		
		this.gotoSlide = function(n) {
			self.current = n;
			
			if (n == self.num_slides) {
				self.current = 0;
				self.gotoSlide(0);
				
			} else self.startSlide();
		}
		
		this.runObject = function(o) {
			var $object = $('#'+ o.id);
			$object.children().hide();
			
			if (typeof o.callback == 'function')
				o.callback.call(this, $object, self);
			
			$object[o.action](o.speed, function(){ self.nextObject(o) });
		}
		
		this.nextObject = function(o) {
			self.current_object++;
			
			if (self.slide_objects[self.current_object]) {
				setTimeout(function(){
					self.runObject(self.slide_objects[self.current_object]);
				}, o.delay);
				
			} else {
				setTimeout(function(){
					self.slides[self.current].end.call(this, self);
				}, self.delay);
			}
		}
		
		this.hidePrevSlide = function(callback) {
			var prev = self.current == 0 ? self.num_slides-1 : self.current-1;
			
			for (var i = 0, len = self.slides[prev].objects.length; i < len; i++) {
				var $object = $('#'+ self.slides[prev].objects[i].id);
				$object.fadeOut(900);
			}
		}
	}
	
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
	$('.ps').live('click', function() {
		$(this.rel).jqprint({ operaSupport: $.browser.opera });
		return false;
	});
	
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
	
	$('#top_map_btn').click(function(){
		var $this = $(this),
			location = $this.attr('rel').split(','),
			lat = parseFloat(location[0]),
			lng = parseFloat(location[1]),
			main_map = $('#main_map');

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
		}, 500);
	});
	
	if ($.on_page([['compare', 'listings']])) $.open_map($('#main_map'));
	
	if ($.on_page([['locator', 'listings']])) {
		var main_map = $('#main_map');
		
		if ($.cookie('main_map_open')) $.open_map(main_map);
		else main_map.hide();
		
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
	
	// add your facility
	$('form#new_client').submit(function(){
		var signup_form = $(this).runValidation();
		
		if (signup_form.data('valid') && !signup_form.data('saving')) {
			signup_form.data('saving', true);
			
			// 1). gather the facility name and location and ask the server for matching listings to allow the user to pick
			var pop_up_title  = 'Add Your Facility',
				pop_up_height = 600,
				sub_partial   = '/clients/signup_steps',
				ajax_loader	  = $('.ajax_loader', this).show(),
				current_step  = 1,
				form_data     = { 
					company : $('#client_company', signup_form).val(),
					email 	: $('#client_email', signup_form).val(),
					city 	: $('#listing_city', signup_form).val(),
					state 	: $('#listing_state', signup_form).val()
				};
			
			$.post('/ajax/find_listings', form_data, function(response){
				$.handle_json_response(response, function(data){
					get_pop_up_and_do({ 'title': pop_up_title, 'height': pop_up_height }, { 'sub_partial': sub_partial }, function(pop_up){ // preping step 2
						var wizard = new GreyWizard($('#workflow_steps', pop_up), workflow_settings);
						
						if (data[0]) {
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
	
	// CLIENT EDIT page
	if ($.on_page([['edit', 'clients']])) {
		$('.selective_hider').live('click', function(){
			var dont_hide  = $(this).attr('rel'),
				hide_these = $('.hideable');
			
			if (dont_hide) {
				hide_these.each(function(){
					if (this.id != dont_hide) {
						$(this).slideUp();
						$(this).prev('.user_hint').slideUp();
					
					} else {
						$(this).slideDown();
						$(this).prev('.user_hint').slideDown();
					}
				});

			} else {
				hide_these.slideDown();
				$('.user_hint').slideDown();
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
					title = 'Enable Online Reservations', 
					height = '486';

				get_pop_up_and_do({ title: title, height: height, modal: true }, { sub_partial: partial, model: 'Client', id: $('#client_id').text() }, function(pop_up) {
					new GreyWizard($('#issn_steps', pop_up), {
						title  : title,
						slides : [
							{	
								pop_up_title : title,
								div_id  : 'issnstep_1',
								action  : issnstep1,
								nav_vis : [['back', 'hide'], ['next', 'fadeOut']]
							},
							{ 
								pop_up_title : 'Grant Access',
								div_id  : 'issnstep_2',
								action  : issnstep2,
								nav_vis : [['back', 'fadeIn'], ['next', function(btn, wizard){ btn.text('Send').data('done', false).fadeIn(); }]],
								validate : issnstep2_validate
							},
							{	
								pop_up_title : 'Request In Process',
								div_id  : 'issnstep_3',
								action  : issnstep3,
								nav_vis : [['back', 'hide'], ['next', function(btn, wizard){ btn.text('Done').data('done', true) }]]
							}
						],
						finish_action : issn_steps_finish
					}).begin_workflow_on(0);
				});
			}
			
			return false;
		});
		
		function issnstep1(wizard) {
			$('#issn_status_option a', '#issnstep_1').unbind('click').click(function(){
				wizard.slide_data[1].opt_id = $(this).attr('rel');
				wizard.slide_data[2].issn_status = $(this).attr('id');
				wizard.next();
				return false;
			});
		}
		
		function issnstep2(wizard) {
			var active_opt = $('#'+ wizard.slide_data[1].opt_id, '#issnstep_2'),
				ajax_loader = $('.ajax_loader', active_opt);

			$('.opt', '#issnstep_2').hide();
			active_opt.show();
			
			if (typeof wizard.slide_data[1].client_info == 'undefined') {
				ajax_loader.show();
				
				$.getJSON('/ajax/get_partial?partial=clients/client_info_text&model=Client&id='+ $('#client_id').text(), function(response){
					$.handle_json_response(response, function(data){
						wizard.slide_data[1].client_info = data;
						$('.client_info_preview', active_opt).append(data);
					});
					
					ajax_loader.hide();
				});
				
			} else $('.client_info_preview', active_opt).html(wizard.slide_data[1].client_info);
		}
		
		function issnstep2_validate(wizard) {
			$('.error', '.issn_enable_opts').remove();
			var error = '', pms = $('select#pm_software', '#'+ wizard.slide_data[1].opt_id);
			
			if (!$('input#agree', '#issnstep_2').is(':checked')) error += '<p>You must agree to grant access in order to continue.</p>'
			if (pms.val() == '') error += '<p>Please select your Property Management System.</p>'
			
			if (error != '') $('.issn_enable_opts', '#'+ wizard.slide_data[1].opt_id).prepend('<div class="flash error">'+ error +'</div>');
			
			return error == '';
		}
		
		function issnstep3(wizard) {
			$('.hide', '#issnstep_3').hide();
			$('#'+ wizard.slide_data[2].issn_status, '#issnstep_3').show();
		}
		
		function issn_steps_finish(wizard) {
			if ($('#enable_test', '#issnstep_3').is(':checked')) {
				var inner = $('.inner', '#issnstep_3'),
					form = $('#enable_test_form', inner).hide(),
					ajax_loader = $('.ajax_loader', '#issnstep_3').show();
				
				$.post(form.attr('action'), form.serialize(), function(response) {
					$.handle_json_response(response, function(data){
						inner.html('<h2 class="framed">'+ data +'</h2>');
						wizard.nav_bar.find('.next').text('Close').unbind('click').click(function(){ window.location.reload(); return false; });
					});
					
					ajax_loader.hide();
				}, 'json');
			} else $('#pop_up').dialog('close');
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
					$.handle_json_response(response, function(data){
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
		
		$('.hint_toggle').click(function(){
			var btn = $(this),
				hint = btn.parents('.user_hint'),
				placement_id = btn.parent('p').attr('id').replace('UserHintPlacement_', ''),
				ajax_loader = $('.ajax_loader', hint).show();

			$.updateModel('/user_hints/'+ btn.attr('rel') +'/'+ placement_id, { model: 'UserHintPlacement' }, function(data){
				hint[btn.attr('rel') == 'hide' ? 'slideUp' : 'slideDown']();
				ajax_loader.hide();
			});	
		});
		
		$('input', '#user_hint_toggles').click(function(){
			$('.hint_toggle[rel='+ this.value +']').click();
		});
		
		var inline_save_orig_values = {};
		$('.inline_save').each(function(){
			inline_save_orig_values[this.id] = this.value.replace(this.title, '');
		});
		
		$('.inline_save').live('focus', function() {
			var input = $(this);
			$('<a class="attribute_save" href="/ajax/update?'+ input.attr('params') +'">Save</a>').appendTo('#email_reports_settings');
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
	
	// Listing Edit
	// NEW LISTING WORKFLOW
		// 1). Click NEW button, get a partial from the server and prepend to the listing box
		$('#add_fac', '#ov-units').click(function(){
			var $this 		   = $(this),
				listing_box    = $('#client_listing_box', $this.parent().parent()),
				empty_listings = $('#empty_listings', listing_box),
				ajax_loader    = $this.prev('.ajax_loader').show();
		
			// GET PARTIAL
			$.getJSON('/ajax/get_partial?model=Listing&partial=/listings/listing', function(response){
				$.handle_json_response(response, function(data){
					var partial 	  = $(data).hide(),
						title_input   = $('input[name="listing[title]"]', partial),
						tip_text	  = $('.new_listing_tip', partial);

					// insert the new listing into either the #empty_listings box or #rslt-list-bg
					if (empty_listings.length > 0) {
						$('.client_tip', empty_listings).remove();
						empty_listings.attr('id', 'rslt-list-bg').prepend(partial);

					} else $('#rslt-list-bg', listing_box).prepend(partial);

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
	
		// 2). bind events to the inputs in the new partial: 
		// SAVE TITLE ON BLUR
		$('.listing:eq(0) input[name="listing[title]"]', '#client_listing_box').live('blur', function(){
			var partial 	  = $('.listing:eq(0)', '#client_listing_box'),
				title_input   = $('input[name="listing[title]"]', partial).removeClass('invalid'),
				tip_text	  = $('.new_listing_tip', partial),
				tip_inner	  = tip_text.find('strong'),
				ajax_loader   = $('#add_fac', '#ov-units').prev('.ajax_loader').show();
		
			if (title_input.val() != '' && title_input.val() != title_input.attr('title')) {
				tip_text.animate({ top: '36px' }); // MOVE TIP TEXT down to address row
				tip_inner.text('Enter the street address.');
				ajax_loader.show();

				$.post('/listings/quick_create', { title: title_input.val() }, function(response){
					if (response.success) partial.attr('id', 'Listing_'+ response.data.listing_id);
					else title_input.addClass('invalid').focus(); // SERVER VALIDATION DID NOT PASS
					ajax_loader.hide();
				}, 'json');
			
			} else {
				title_input.addClass('invalid').focus();
				ajax_loader.hide();
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
			$('.rslt-reserve a', '.listing:eq(0)').live('click', function(){
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
						$.handle_json_response(response, function(data){
							button.text('Edit').unbind('click').attr('href', '/clients/'+ $('#client_id').text() +'/listings/'+ listing_id +'/edit');

							listing_html = $(data);
							partial.html(listing_html.html()).removeClass('active');
							$('#listings_size').text(parseInt($('#listings_size').text())+1);
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
				$.handle_json_response(response, function(data){
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
			$.handle_json_response(response, function(data){
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
	$('#picture_facility_image', '#new_picture').change(function(){
		if ($(this).val() != '') $('#new_picture').ajaxSubmit({
			dataType: 'json',
			beforeSubmit: function(arr, $form, options) {
				//$('.ajax_loader', $form).show();
				var thumb = $('<li><img src="/images/ui/ajax-loader-lrg.gif" id="thumb_loader" alt="" /><a class="iconOnly16 delete_link right" title="Delete this picture">Delete</a></li>');
				
				if ($('.big-pic', '#sl-tabs-pict-in').length == 0) {
					var image = $('<img class="big-pic" id="/images/ui/ajax-loader-lrg.gif" src="" alt="" />');
					$('.gallery', '#sl-tabs-pict-in').append(image);
				}
				
				$('#sl-tabs-pict-gall').append(thumb);
				thumb.hide().fadeIn(600, function(){
					//$('img', this).trigger('mouseover');
				});
				
				setTimeout(function(){ $('#picture_facility_image', $form).val('') }, 100);
			},
			success: function(response){
				$.handle_json_response(response, function(data){
					var thumb = $('#thumb_loader', '#sl-tabs-pict-in');
					thumb.attr({ src: data.thumb, id: 'Picture_'+ data.id });
					$('#Picture_'+ data.id).next('a').attr('href', '/listings/'+ data.listing_id +'/pictures/'+ data.id);
					$('#big-pic', '#sl-tabs-pict-in').attr({ id: 'BigPicture_'+ data.id, src: data.image });
					$(thumb).trigger('mouseover');
					
					update_info_tab_count('Pictures', 1);
				});
				
				$('.ajax_loader', '#new_picture').hide();
				$('#picture_facility_image', '#new_picture').val('');
			}
		})
	});
	
	// change big-pic when thumb is hovered
	$('img', '#sl-tabs-pict-gall').live('mouseover', function(){
		if (this.id == 'thumb_loader') return false;
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
				$.handle_json_response(response, function(data){
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
	
	var stats_graph = $('#stats_graph');
	if (stats_graph.length > 0) {
		stats_graph.addClass('loading');
		
		var stats_models = 'clicks, impressions, reservations',
			d = new Date(), // getMonth returns 0-11
			end_date = new Date(d.getFullYear(), d.getMonth(), d.getDate()+1),
			start_date = new Date(d.getFullYear(), d.getMonth()-1, d.getDate());
		
		$.getJSON('/ajax/get_client_stats?start_date='+ start_date +'&end_date='+ end_date +'&stats_models='+ stats_models +'&client_id='+ $('#client_id').text(), function(response){
			$.handle_json_response(response, function(data){
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
					legend: { show: true, location: 'nw' },
					series: [ 
				        { label: '&nbsp;Clicks', lineWidth: 2, markerOptions: { style: 'diamond' } }, 
				        { label: '&nbsp;Impressions', lineWidth: 2, markerOptions: { size: 7, style:'x'} }, 
				        { label: '&nbsp;Reservations', lineWidth: 2, markerOptions: { style: 'circle'} }
				    ],
					highlighter: { sizeAdjust: 7.5 },
					cursor: { show: true, zoom: true }
				});
			});
			
			stats_graph.removeClass('loading');
		});
	}
	
	// Client tips block
	$('.client_tip:not(:first)', '#tips-box').hide();
	var client_tip_boxes = $('.client_tip', '#tips-box');
	
	if (client_tip_boxes.length > 0) {
		$('a', '#tips-box-bottom').click(function(){
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
	
});

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
						input 		= $('<input type="text" class="small_text_field '+ label_text +'" name="'+ field_name +'" value="'+ $self.text() +'" />');

					input.prependTo($self.parent());
				});
				
				$('.small_text_field', $this).eq(0).focus();
				$(this).text('Save');
				$.bindPlugins(); // so that hinty and formbouncer will work.
				
			} else if ($(this).text() == 'Save' && !$(this).data('saving')) {
				$(this).data('saving', true);
				ajax_loader.show();
				
				// put copies of the inputs into the form so we can serialize it and send the data
				$('input', $this).each(function(){ hidden_form.append($(this).clone()); });
				
				$.post(hidden_form.attr('action'), hidden_form.serialize(), function(response){
					$.handle_json_response(response, function(data){
						$('.value', $this).each(function(){
							var this_val   = $(this),
								this_input = $('input', this_val.parent()).hide();

							this_val.text(this_input.val()).fadeIn(1000);
						});
						
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

// first implemented for the client sign up page (add your facility)
var GreyWizard = function(container, settings) {
	var self = this;
	self.form_data 	= {};
	self.settings 	= settings;
	self.slide_data = settings.slides;
	self.slides_class = settings.slides_class || 'workflow_step',
	self.nav_id		= settings.nav_id || 'workflow_nav',
	self.num_slides = self.slide_data.length;
	self.workflow 	= $(container);
	self.title_bar 	= $('#ui-dialog-title-pop_up', self.workflow.parent().parent());
	self.width	  	= self.workflow.width();
	self.height   	= self.workflow.height();
	self.slides   	= $('.'+ self.slides_class, self.workflow).each(function(){ $(this).data('valid', true) });
	self.spacer		= settings.spacer || 100; // to give the slides space between transitions
	self.slide_speed = settings.slide_speed || 1500,
	self.btn_speed  = settings.btn_speed || 900,
	self.fade_speed = settings.fade_speed || 1000,
	
	this.begin_workflow_on = function(step) {
		self.workflow.parents('#pop_up').show();
		self.nav_bar  	= $('#'+ self.nav_id, self.workflow).children().hide().end(); // set initial nav state on each run
		self.current  	   = step || 0;
		self.current_slide = $('#'+ self.slide_data[self.current].div_id, self.workflow);
		self.skipped_first = step > 0 ? true : false;
		
		self.set_slides();
		
		// bind events
		self.nav_bar.find('.next, .skip').click(self.next);
		self.nav_bar.find('.back').click(self.prev);
		
		self.title_bar.change(function(){
			if (self.slide_data[self.current].pop_up_title) $(this).text(self.slide_data[self.current].pop_up_title);
			else $(this).text(self.settings.title + ' - Step '+ (self.current+1));
			
		}).trigger('change');
		
		if (typeof self.slide_data[self.current].action == 'function') self.slide_data[self.current].action.call(this, self);
		self.set_nav();
	}
	
	this.set_slides = function() {
		if (typeof set_display == 'undefined') set_display = false;
		
		// arrange the slides so they are horizontal to each other, allowing for arbitrary initial slide number
		self.slides.each(function(i){
			// calculate the left position so that the initial slide is at 0
			var left = -((self.width + self.spacer) * (self.current - i))
			$(this).css({ position: 'absolute', top: 0, left: left +'px' });
		});
		
		if (self.settings.set_slides) { // build the slide tabbed nav
			var slide_display_html = '<div id="slide_nav">',
				active_slides 	   = self.num_slides - (self.skipped_first ? 1 : 0),
				slide_tab_width    = parseInt(100 / active_slides) - (self.skipped_first ? 3 : 2.68), // tested in FF 3.6
				done_skipping 	   = false;
			
			for (var i = 0; i < self.num_slides; i++) {
				if (self.skipped_first && !done_skipping) { done_skipping = true; continue; }
				
				slide_display_html += '<div id="tab_step_'+ i +'" class="slide_display '+ (self.current == i ? ' active' : '') + (i == (self.skipped_first ? 1 : 0) ? ' first' : (i == self.num_slides-1 ? ' last' : '')) +'" style="width:'+ slide_tab_width +'%;">'+
										   '<p>Step '+ (i+1) +'</p>'+
											self.slide_data[i].slide_display +
									   '</div>';
											
			}
			
			slide_display_html += '</div>';
			self.workflow.parent().append(slide_display_html);
		}
	}
	
	this.set_nav = function() {
		if (typeof self.slide_data[self.current] != 'undefined') {
			$.each(self.slide_data[self.current].nav_vis, function(){ // get the current slide's nav actions
				var btn = $('#'+ this[0]),
					action = this[1];
			
				if (action) {
					if (typeof action == 'function') action.call(this, btn, self); 
					else if (typeof action == 'string') btn[action]((action == 'hide' || action == 'show' ? null : self.btn_speed));
				}
			});
		}
		
		setTimeout(function() {
			$('.slide_display', self.workflow.parent()).removeClass('active');
			$('#tab_step_'+ self.current, self.workflow.parent()).addClass('active');
		}, self.fade_speed);
	}
	
	this.may_move = function(step) {
		var validated = true;
		if (typeof self.slide_data[self.current].validate == 'function' && step > 0) validated = self.slide_data[self.current].validate.call(this, self);
		
		return validated && ((self.current + step) >= 0 && (self.current + step) <= self.num_slides) && (step < 0 || (step > 0 && !$('.next', self.workflow).data('done')));
	}
	
	this.next = function(step) {
		if (typeof step != 'number') var step = 1;
		
		self.move(step);
		return false;
	}
	
	this.prev = function(step) {
		if (typeof step != 'number') var step = -1;
		
		self.move(step);
		return false;
	}
	
	this.move = function(step) {
		if (self.may_move(step)) {
			self.set_slides(); // this prevents the animation from knocking the positions off track if a user clicks nav buttons erratically 
			if (step > 0) $('#tab_step_'+ self.current, self.workflow.parent()).addClass('done');
			self.current += step;
			
			self.slides.each(function(i){
				var left = (self.width + self.spacer) * (-step) + parseInt($(this).css('left'));
				$(this).stop().animate({ left: left + 'px' }, self.slide_speed);
			});
			
			self.set_nav();
			self.slide_data[self.current].action.call(this, self);
			self.title_bar.trigger('change');
			
		} else if (self.current == self.num_slides-1 && typeof(self.settings.finish_action) == 'function') 
			self.settings.finish_action.call(this, self);
	}
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
				['back', function(btn, wizard){ /*wizard.skipped_first ? btn.hide() : btn.fadeIn();*/ btn.unbind('click', close_pop_up_and_focus_on_fac_name) }]
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

function workflow_step2() {
	var wizard 	     = arguments[0],
		listings_box = $('.small_listings', arguments[0].workflow);
	
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

		setTimeout(function(){ listings_box.fadeIn(wizard.settings.fade_speed) }, 350);
	}
}

function workflow_step3() {
	var wizard    = arguments[0],
		addresses = get_checked_listings_addresses(wizard),
		city 	  = $('#listing_city', '#new_client').val(),
		state 	  = $('#listing_state', '#new_client').val(),
		zips	  = get_checked_listings_addresses(wizard, 'zip');
	
	if (addresses.length == 1) $('#listing_address', wizard.workflow).val(addresses[0]);
	else $('#listing_address', wizard.workflow).autocomplete({ source: addresses });
	
	if (zips.length == 1) $('#listing_zip', wizard.workflow).val(zips[0]);
	else $('#listing_zip', wizard.workflow).autocomplete({ source: zips });
	
	$('#listing_city', wizard.workflow).val(city);
	$('#listing_state', wizard.workflow).val(state.toUpperCase());
	
	// bind plugins and change pop_up title
	$('.hintable', wizard.workflow).hinty();
	$('.numeric_phone', wizard.workflow).formatPhoneNum();
	$('.city_state_zip .autocomplete', wizard.workflow).autocomplete();
	
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
	setTimeout(function(){ review.fadeIn(wizard.settings.fade_speed) }, 350);
}

function finish_workflow() {
	var wizard = arguments[0],
		next_button = $('.next', arguments[0].workflow);
	
	if (!next_button.data('saving')) {
		next_button.data('saving', true).before('<img src="/images/ui/ajax-loader-facebook.gif" class="ajax_loader" alt="Loading..." />');
		next_button.prev('.ajax_loader').show();

		$.post('/clients', wizard.form_data, function(response){
			$.handle_json_response(response, function(data){
				wizard.workflow.parents('#pop_up').dialog('close');
				$('#top_fac_page').html(data);
			});
			
			next_button.prev('.ajax_loader').hide().data('saving', false);
			$('.ui-autocomplete').remove();
		});
	}
	
	return false;
}

function get_checked_listings_addresses(wizard, address_part) {
	if (typeof address_part == 'undefined') var address_part = 'street_address'
	var checked = $('#signupstep_2 :checkbox:checked', wizard.workflow),
		addresses = [];
	
	checked.each(function(){
		var part = $('.'+ address_part, '#Listing_'+ this.value).text();
		addresses.push(part);
	});
	
	return addresses;
}

// pulls the pop_up template and runs the callback
// params requires sub_partial. e.g params.sub_partial 
function get_pop_up_and_do(options, params, callback) {
	var params = params || {}
	params.partial = params.partial || '/shared/pop_up';
	
	$.get('/ajax/get_multipartial', params, function(response) {
		var pop_up = $(response).dialog({
			title: 	   options.title,
			width: 	   options.width || 785,
			minHeight: options.minHeight || 420,
			height:    options.height,
			resizable: false,
			modal: 	   options.modal,
			close: 	   function() {
				$('.ajax_loader').hide();
				$(this).dialog('destroy').remove();
			}
		});
		
		if (typeof callback == 'function') callback.call(this, pop_up);
	});
}

function get_partial_and_do(params, callback) {
	var params = params || {}
	params.partial = params.partial || '/shared/pop_up_box';
	
	$.get('/ajax/get_partial', params, function(response) {
		callback.call(this, $(response));
	});
}

// updates the info tab count in the listings edit page. the tab text is: <label> (<count>)
function update_info_tab_count(label, i) {
	var	tab = $('#tab_'+ label, '#sl-tabs'),
			count = parseInt(tab.text().split('(')[1].replace(')', '')) + i;
	
	tab.text(label + ' ('+ count +')');
}

function preload_us_map_imgs() {
	var states = ["al", "ak", "az", "ar", "ca", "co", "ct", "de", "fl", "ga", "hi", "id", "il", "in", "ia", "ks", "ky", "la", "me", "md", "ma", "mi", "mn", "ms", "mo", "mt", "ne", "nv", "nh", "nj", "nm", "ny", "nc", "nd", "oh", "ok", "or", "pa", "ri", "sc", "sd", "tn", "tx", "ut", "vt", "va", "wa", "wv", "wi", "wy"];
	$.each(states, function(){
		var img = new Image();
		img.src = '/images/ui/storagelocator/us_map/'+ this +'.png';
	});
}