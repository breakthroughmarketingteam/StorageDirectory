/***************** UTILITY FUNCTIONS *****************/
$ = jQuery;
$(document).ready(function(){	
	$('body').addClass('js');
	$('.hide_if_js').hide();
	$('.flash').hide().slideDown();
	
	try { // to load external plugins, ignore failure (if plugins weren't selected in site settings)
		$.bindPlugins(); // calls a few common plugins, also used after a new element that uses a plugin is created in the dom
	} catch (e){};
	
	$('.disabler', '.disabled').disabler();  // checkbox that disables all inputs in its form
	$('.anchorListener').anchorDispatch();   // toggle an element when its id is present in the url hash
	$('.row_checkable').rowCheckable();			 // clicking a whole form also enables its first checkbox
	$('.pane_switch').paneSwitcher();				 // use a checkbox to switch between two containers. classes: .pane_0, .pane_1
	$('.toggle_div').toggleDiv();						 // use a checkbox to show/hide its parents next sibling div
	$('.trans2opaq').animOpacity();					 // animates from transparent to opaque on hover, css sets initial opacity
	$('.link_div').linkDiv();								 // attack a click event to divs that wrap a link to follow the href
	$('.param_filled').fillWithParam(); 		 // fill matching inputs with the param from its rel attr
	$('.table_sort').appendParamAndGo();		 // append the key-val in the elements rel attr to the href and go to it
	$('.openDiv').openDiv();					 // click a link to open a hidden div near by
	$('.search-btn, .search-button').submitBtn();						 // make a link act as a submit button
	$('h4 a', '#info-accordion').accordion(); // my very own accordion widget :)
	$('.tabular_content').tabular_content(); // a div with a list as the tab nav and hidden divs below it as the tabbed content
	$('.clickerd').clickOnLoad();             // a click is triggered on page load for these elements
	$('.instant_form').instantForm();		// turn a tags with class name label and value into form labels and inputs
	$('.numeric_phone').formatPhoneNum();     // as the user types in numbers, the input is formated as XXX-XXX-XXXX
	
	// we call the toggleAction in case we need to trigger any plugins declared above
	$.toggleAction(window.location.href, true); // toggle a container if its id is in the url hash
	
	// sortable nav bar, first implemented to update the position attr of a page (only when logged in)
	$('.sortable', '.admin').sortable({
		opacity: 0.3,
		update: function(e, ui) { $.updateModels(e, ui); }
	});
	
	$('.block_sortable', '.admin').sortable({
		opacity: 0.3,
		placeholder: 'ui-state-highlight',
		helper: 'clone',
		update: function(e, ui) {
			$.updateModels(e, ui);
		}
	});
	
	if ($('.mini_calendar').length > 0) {
		$('.mini_calendar').datepicker();
		$('.datepicker_wrap').click(function(){ $('.mini_calendar', this).focus(); });
	}
	
	$('ul li a', '#ov-reports-cnt').click(function(){
		get_pop_up(this);
		return false;
	});
	
	$('.autocomplete').live('focus', function(){
		var $this   = $(this),
			info	= $this.attr('rel').split('|')[0],
			minLen	= $this.attr('rel').split('|')[1],
			model   = info.split('_')[0],
			method  = info.split('_')[1];
		
		$.getJSON('/ajax/get_autocomplete', { model: model, method: method }, function(response){
			if (response.success && response.data.length > 0) { 
				$this.autocomplete({
					source: response.data,
					minLength: minLen
				});
			} else $.ajax_error(response);
		})
	});
	
	$('a', '#admin-box').click(function(){
		var $this = $(this),
			other_links = $('a:not(this)', '#admin-box').removeClass('active');
		$this.addClass('active');
	});
	
	$('.selectable').live('click', function(){
		var $this = $(this),
			checkbox = $('input[type=checkbox]', $this);

		if (!$this.data('selected')) {
			$this.data('selected', true).addClass('selected');
			checkbox.trigger('change').attr('checked', true);
		} else {
			$this.data('selected', false).removeClass('selected');
			checkbox.trigger('change').attr('checked', false);
		}
	});
	
	// admin menu hover behaviors
	var GR_content_menu_hover_interval,
		GR_resource_list = $('#resource_list');
	
	$('#content_menu_link').mouseover(function() {
		GR_resource_list.slideDown();
		return false;
	});
	
	$('#content_menu_link').click(function() {
		GR_resource_list.slideDown();
		return false;
	});
	
	$('#resource_list, #content_menu_link').mouseout(function(){
		GR_content_menu_hover_interval = setTimeout('GR_resource_list.slideUp()', 1000);
	});
	
	$('#resource_list, #content_menu_link').mouseover(function(){
		clearInterval(GR_content_menu_hover_interval);
	});
	
	$('li', '#resource_list').hover(function(){
		var li = $(this).css('position', 'relative');
		var link = $('a', li);
		
		if (link.hasClass('access_denied')) return;
		
		var new_option = $('<a class="admin_new_link admin_hover_option" href="'+ link.attr('href') +'/new">New</a>');
				new_option.appendTo(link)
									.hide().show()
									.click(function(){ window.location = this.href; return false; });
	}, function(){
		$('.admin_new_link', '#resource_list').fadeOut(300, function(){ $(this).remove(); });
	});
	// END admin menu
	
	// helpers
	$('.unique_checkbox').click(function() {
		var $this = $(this);
		$('input[type=checkbox]', $this.parent().parent().parent()).attr('checked', false);
		$this.attr('checked', !$this.is(':checked'))
	});
	
	$('.unique_checkbox').click(function() {
		var $this = $(this);
		$('input[type=checkbox]', $this.parent().parent().parent()).attr('checked', false);
		$this.attr('checked', !$this.is(':checked'))
	});
	
	// TODO: fix the toggle button, it doesn't turn off the editor, find out where the editor remove function is
	$('textarea.wysiwyg').each(function(i) {
		var textarea = jQuery(this),
				toggle = jQuery('<a href="#" class="toggle right" id="toggle_' + i + '">Toggle Editor</a>');
		
		textarea.parent().parent().prepend(toggle);
		
		toggle.click(function() {
			CKEDITOR.replace(textarea.attr('name'));
			return false;
		});
	});
	
	// toggle_links have a hash (#) of: #action_elementClass_contextClass 
	// e.g. #show_examples_helptext => $('.examples', '.helptext').show();
	$('.toggle_action').click(function() {
		$.toggleAction(this.href, false);
		return false;
	});
	
	// ajax links point to the ajax_controller, the href contains an action, and other key-values pairs such as model class,
	// model id, the attribute to update, and the value, see the ajax_controller for other actions and required params
	// use conditional logic to handle the success callback based on attributes of the clicked link, 
	// such as what element to update on success, or what part of the dom should change 
	$('.ajax_action').live('click', function(){
		var $this = $(this);
		$this.addClass('loading');
		
		if ($.mayContinue($this)) {
			$.getJSON(this.href + '&authenticity_token=' + $.get_auth_token(), {},
				function(response) {
					$this.removeClass('loading');
					
					if (response.success) {
						// need better conditional logic for these links
						if ($this.attr('rel') == 'helptext') {
							$.toggleHelptext($this);
							
						} else if ($this.hasClass('delete_link')) {
							$this.parent().parent().slideUp(300, function(){ $(this).remove(); });
						}
						
					} else {
						$.ajax_error(response);
						$this.removeClass('loading');
					}
				}
			);
		} else $this.removeClass('loading');
		
		return false;
	});
	
	// Partial addables, grab html from a div and add it to the form, used on forms and permissions create and edit
	$('.add_link', '.partial_addable').live('click', function(){
		var $this 			= $(this),
				context 		= '#' + $this.attr('rel'),
				partial_form = $($('.partial_form_html', context).html());
	
		$('input, select, checkbox', partial_form).each(function(){ $(this).attr('disabled', false); });
	
		partial_form.hide().prependTo('.partial_forms_wrap', context).slideDown(600);
		$.bindPlugins(); // first implemented to call hinty
		
		return false;
	});
	
	$('.cancel_link', '.partial_addable').live('click', function(){
		$(this).parent().parent().slideUp(300, function(){ $(this).remove(); }); 
		return false; 
	});
	
	// retrieves a partial via ajax and inserts it into the target div
	$('.insert_partial').live('click', function(){
		var $this = $(this);
		
		$.get(this.href, function(response){
			$('#' + $this.attr('rel')).html(response);
		})
		
		return false;
	});
	
	$('.inline_delete_link').live('click', function(){
		var $this = $(this);
		
		if ($.mayContinue($this)) {
			if (this.rel.split('_')[1] == '0') $this.parent().parent().slideUpAndRemove();
			else $('#'+ $this.attr('rel')).slideUpAndRemove();
		}
		
		return false;
	});
	
/******************************************* PAGE SPECIFIC BEHAVIOR *******************************************/
	
	// front page
	$('a', '#click-more').click(function(){
		var $this = $(this);
		if (!$this.data('open')) {
			$this.data('open', true)
			$this.text('Click to close');
		} else {
			$this.data('open', false)
			$this.text('Click to open')
		}
	});
	
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
		
		this.gotoSlide = function(n) {
			self.current = n;
			
			if (n == self.num_slides) {
				self.current = 0;
				self.gotoSlide(0);
				
			} else self.startSlide();
		}
		
		this.startSlide = function() {
			if (typeof self.slides[self.current].start == 'function') self.slides[self.current].start.call(this, self);
			
			self.hidePrevSlide();
			self.slide_objects = self.slides[self.current].objects;
			self.current_object = 0;
			self.runObject(self.slide_objects[0]);
		}
		
		this.runObject = function(o) {
			var $object = $('#'+ o.id);
			$object.children().hide();
			
			if (typeof o.callback == 'function')
				o.callback.call(this, $object, self);
			
			$object[o.action](o.speed, function() {
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
			});
		}
		
		this.hidePrevSlide = function(callback) {
			var prev= self.current == 0 ? self.num_slides-1 : self.current-1;
			
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
						{ id : 'bub1', action: 'fadeIn', speed: 1000, delay: 6000, callback: function(o, s){ o.html('<blockquote>I found it on USSelfStorageLocator.com</blockquote>').children().hide().fadeIn('slow') } }
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
						{ id : 'bub3', action: 'fadeIn', speed: 1000, delay: 6000, callback: function(o, s){ o.html('<blockquote>They helped me get a really great deal!</blockquote>').children().hide().fadeIn('slow') } }
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
		
		// move the sidebar with the page
		var move_me = $('#content_bottom .region_content_bottom');
		$(window).scroll(function(e){
			if (e.currentTarget.scrollY >= 176) move_me.css({ position: 'fixed', top: '15px' });
			else move_me.css({ position: 'static'  });
		});
	}
	
	// Views/Forms/Links Edit
	if ($.on_page([['edit, new', 'views, forms, links']])) {
		var scope_down = ''; 
		if ($.on_page([['edit, new', 'views']])) scope_down = 'owner';
		else scope_down = 'target';
		
		// when the user chooses a scope (aka resource), show the scope-dependent owner_id or target_id dropdown
		// which is populated by models of the selected scope class
		var scoping_fields = $('#scope_' + scope_down + '_fields', '#body');
		
		if ($('.scope_down_hidden', scoping_fields).val()) { // preselect owner or target from dropdown
			var scoper_id = $('.scope_down_hidden', scoping_fields).val();
			
			scoping_fields.children().each(function(){
				if (this.value == scoper_id) this.selected = 'selected';
			});
		} else scoping_fields.hide();
		
		// grab model instances that are of the selected class
		$('.scope_dropdown', '#scope_fields').change(function(){
			var $this = $(this);
			
			if ($this.val() != '') { // retrieve all models of this class
				scoping_fields.show(100);
				scoping_dropdown = $('.scoping_dropdown', scoping_fields);
				scoping_dropdown.html('<option>Loading ' + $this.val() + '...</option>');
				
				$.getJSON('/ajax/get_all', { model: $this.val(), authenticity_token: $.get_auth_token() },
					function(response) {
						if (response.success) {
							var args = { attribute: 'name', select_prompt: (scoping_dropdown.hasClass('no_prompt') ? '' : 'Active Context') }
							var option_tags = $.option_tags_from_model($this.val(), response.data, args);
							scoping_dropdown.html(option_tags);
							
						} else {
							scoping_dropdown.html('<option>Error Loading Records</option>')
						}
					}
				);
			} else scoping_fields.hide(300);
		}); // END .scope_dropdown.change()
		
		// get the attributes of the resource selected from #form_controller in the form new/edit page
		$('#form_controller', '#FormsForm').change(function(){
			fillInFormFieldSelectLists($(this).val()); 
		});
		
		// create a custom event on the select lists so that when they finish loading the options, we can select the
		// field's field_name that matches in the list
		$('.field_attr_name', '#form_builder').bind('filled', function(){
			$('.field_attr_name', '#form_builder').each(function(){
				var $this = $(this),
						name = $this.prev('span.field_name').text(); // we stored the field_name value in a hidden span
				
				$this.children('option').each(function(){
					var $this_option = $(this);
					if ($this_option.val() == name) $this_option.attr('selected', true);
				});
			});
			
			// this field name is useful for specifying a hidden field with a return path for after submit the form
			$(this).append('<option value="return_to">return_to</option>');
		});
		
		$('.delete_link', '#form_builder').live('click', function(){
			var $this = $(this),
					field_id = $(this).attr('rel').replace('field_', '');

			$this.parent().parent().html();
			return false;
		});
	} // END Edit/New Views/Forms/Links
	
	// Edit Forms
	if ($.on_page([['edit', 'forms']])) {
		// fill in the field name select lists
		var resource = $('#form_controller', '#FormsForm').val();
		fillInFormFieldSelectLists(resource);
		
	} // END Edit Forms
	
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
				if (response.success) {
					get_pop_up_and_do(sub_partial, pop_up_title, pop_up_height, function(pop_up){ // preping step 2
						var wizard = new GreyWizard($('#workflow_steps', pop_up), workflow_settings);
						
						if (response.data[0]) {
							workflow_settings.slides[0].data = response.data;
							wizard.begin_workflow_on(0);
							
						} else wizard.begin_workflow_on(1);
						
						signup_form.data('saving', false);
					});
					
				} else $.ajax_error(response);
				
			}, 'json');
		} 
		
		return false;
	});
	
	// client edit page
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
	
	$('.hint_close').click(function(){
		var btn = $(this),
			hint = btn.parents('.user_hint'),
			placement_id = btn.attr('id').replace('UserHintPlacement_', ''),
			ajax_loader = $('.ajax_loader', hint).show();
		
		$.updateModel('/user_hints/hide/'+ placement_id, { model: 'UserHintPlacement' }, function(data){
			ajax_loader.hide();
			hint.slideUp(300, function(){ $(this).remove() });
		});	
	});
	
	// NEW LISTING WORKFLOW
		// 1). Click NEW button, get a partial from the server and prepend to the listing box
		$('#add_fac', '#ov-units').click(function(){
			var $this 		   = $(this),
				listing_box    = $('#client_listing_box', $this.parent().parent()),
				empty_listings = $('#empty_listings', listing_box),
				ajax_loader    = $this.prev('.ajax_loader').show();
		
			// GET PARTIAL
			$.get('/ajax/get_partial?model=Listing&partial=/listings/listing', function(partial){
				var partial 	  = $(partial).hide(),
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
					else { // SERVER VALIDATION DID NOT PASS
						title_input.addClass('invalid').focus();
					}
					
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
						if (response.success) {
							button.text('Edit').unbind('click').attr('href', '/clients/'+ $('#client_id').text() +'/listings/'+ listing_id +'/edit');

							listing_html = $(response.data);
							partial.html(listing_html.html()).removeClass('active');
							$('#listings_size').text(parseInt($('#listings_size').text())+1);

						} else $.ajax_error(response);

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
	
	// Listing Pictures
	// upload pics
	$('#picture_facility_image', '#new_picture').change(function(){
		if ($(this).val() != '') $('#new_picture').ajaxSubmit({
			dataType: 'json',
			beforeSubmit: function(arr, $form, options){
				$('.ajax_loader', $form).show();
			},
			success: function(response){
				if (response.success) {
					var thumb = $('<li><img src="'+ response.data.thumb +'" id="Picture_'+ response.data.id +'" alt="" /><a class="iconOnly16 delete_link right" href="/listings/'+ response.data.listing_id +'/pictures/'+ response.data.id +'" title="Delete this picture">Delete</a></li>'),
						image = $('<img class="big-pic" id="BigPicture_'+ response.data.id +'" src="'+ response.data.image +'" alt="" />');
					
					$('#sl-tabs-pict-gall').append(thumb);
					thumb.hide().fadeIn(600)
					
					if ($('.big-pic', '#sl-tabs-pict-in').length == 0) {
						$('.gallery', '#sl-tabs-pict-in').append(image);
						image.hide().fadeIn('slow');
						thumb.find('img').addClass('active');
					}
					
					
				} else $.ajax_error(response);
				
				$('.ajax_loader', '#new_picture').hide();
				$('#picture_facility_image', '#new_picture').val('');
			}
		})
	});
	
	// change big-pic when thumb is hovered
	$('img', '#sl-tabs-pict-gall').live('mouseover', function(){
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
				if (response.success) {
					if (img.hasClass('active')) $('img:not(#'+ img.attr('id') +')', '#sl-tabs-pict-gall').trigger('mouseover');
					img.parent().fadeOut(600, function(){ $(this).remove() });
					
					if ($('img', '#sl-tabs-pict-gall').length == 1) $('.big-pic', '#sl-tabs-pict-in').eq(0).fadeOut(900, function(){ $(this).remove() });

				} else $.ajax_error(response);
				
				$(this).data('deleting', false);
			}, 'json');
		}
		
		return false;
	});
	
	var stats_graph = $('#stats_graph');
	if (stats_graph.length > 0) {
		stats_graph.css('background', 'url(/images/ui/ajax-loader-lrg.gif) no-repeat 50% 45%');
		
		var stats_models = 'clicks, impressions, reservations',
			d = new Date(), // getMonth returns 0-11
			end_date = new Date(d.getFullYear(), d.getMonth(), d.getDate()+1),
			start_date = new Date(d.getFullYear(), d.getMonth()-1, d.getDate());
		
		$.getJSON('/ajax/get_client_stats?start_date='+ start_date +'&end_date='+ end_date +'&stats_models='+ stats_models +'&client_id='+ $('#client_id').text(), function(response){
			if (response.success) {
				var plot_data = [],
					stats_arr = stats_models.split(/,\W?/);
				
				for (i in stats_arr) 
					plot_data.push(response.data['data'][stats_arr[i]]);
				
				$.jqplot('stats_graph', plot_data, {
					axes: {
						xaxis: { 
							renderer: $.jqplot.DateAxisRenderer,
							rendererOptions: { tickRenderer: $.jqplot.CanvasAxisTickRenderer },
				            tickOptions: {
				                formatString:'%b %#d, %Y', 
				                fontSize:'12px'
				            }
						},
						yaxis: { min: 0, max: parseInt(response.data['max']) + 1 },
					},
					legend: { show: true, location: 'nw' },
					series: [ 
				        { label: '&nbsp;Clicks', lineWidth: 2, markerOptions: { style: 'diamond' } }, 
				        { label: '&nbsp;Impressions', lineWidth: 2, markerOptions: { size: 7, style:'x'}}, 
				        { label: '&nbsp;Reservations', lineWidth: 2, markerOptions: { style: 'circle'} }
				    ],
					highlighter: { sizeAdjust: 7.5 },
					cursor: { show: true, zoom: true }
				})
				
			} else $.ajax_error(response);
			
			stats_graph.css('background', 'none');
		});
	}
	
});

$.option_tags_from_model = function(model_class, models, options) {
	var attribute = options.attribute || 'name',
	 	select_prompt = options.select_prompt || false,
		option_tags = select_prompt ? '<option value="">' + select_prompt + '</option>' : '';
	
	$.each(models, function(i) {
		if (attribute == 'name' && !this[model_class]['name']) attribute = 'title';
		else if (attribute == 'title' && !this[model_class]['title']) attribute = 'name';
		
		option_tags += '<option value="' + this[model_class]['id'] + '">(' + this[model_class]['id'] +') ' + this[model_class][attribute] + '</option>';
	});
	
	return option_tags;
}

$.option_tags_from_array = function(options, selected) {
	var options_tags = '';
	
	$.each(options, function(){
		options_tags += '<option'+ (selected && selected == this ? 'selected="selected"' : '') +' value="'+ this +'">'+ this + '</option>';
	});
	
	return options_tags;
}

$.log = function(msg) {
	if (typeof console != 'undefined') console.log(msg); else alert(msg);
}

$.ajax_error = function(response) {
	if (typeof console == 'undefined') alert(response.data);
	else console.log(response);
	//$('#body').prepend('<div class="flash error hide">'+ response.data +'</div>').slideDown();
}

// take an array of actions and controllers to see if any pair of those match the page we're on
// either set can be a single action or controller as a string or a comma separated string of multiple actions or controllers
$.on_page = function(route_sets) { // routes looks like: [ ['edit, new', 'views, forms, links'], ['index', 'pages'] ]
	var i = route_sets.length,
			actions,
			controllers,
			route = [
				$('body').attr('class').split(' ')[0].replace('_action', ''),
				$('body').attr('id').replace('_controller', '')
			];
	
	while (i--) { // iterate through all the action/controller sets
		actions 		= route_sets[i][0].split(/,\W?/);
		controllers = route_sets[i][1].split(/,\W?/);
		
		var j = actions.length;
		while (j--) { // check each action
			if (route[0] != actions[j]) continue; // skip to the next one
			
			var k = controllers.length;
			while (k--) { // action matched, now match with a controller
				if (route[1] == controllers[k]) return true;
			}
		}
	}
}

$.get_auth_token = function() {
	var token = $('input[name=authenticity_token]').val();
	return token;
}

$.validateAnimationAction = function(action) {
	return /^show$|^hide$|^slideDown$|^slideUp$/.test(action);
}

$.switch_action_hash = function(this_el, action, elementClass, contextClass) {
	action = $.switch_actions(action);
	$(this_el).attr('href', $(this_el).attr('href').split('#')[0] + '#' + action + '_' + elementClass + '_' + contextClass); 
	$(this_el).toggleClass('toggle_down');
}

// return the opposite action
$.switch_actions = function(action) {
	var action_sets = [
		['show',						'hide'],
		['fadeIn',			 'fadeOut'],
		['slideDown',		 'slideUp'],
		['addClass', 'removeClass']
	];
	
	var i = action_sets.length; 
	while (i--) { // return the opposite of the action in question
		if (action_sets[i].indexOf(action) >= 0) return action_sets[i][(action_sets[i].indexOf(action) ^ 1)];
	}
}

$.disable = function(disabler, disablee) {
	$(disablee, disabler.parent().parent()).each(function(i){
		if (this.name != disabler.attr('name')) $(this).attr('disabled', !disabler.data('enabled'));
	});
}

$.disableToggle = function(disabler, disablees) {
	disabler.data('enabled', !disabler.data('enabled'));
	$.disable(disabler, disablees);
}

// call a jquery show/hide method on matching element from the selectors present in the href
$.toggleAction = function(href, scroll_to_it) {
	var url_hash = href.split('#');
	
	if (url_hash[1]) {
		var url_hash	 = url_hash[1],
	 		action		 = url_hash.split('_')[0],
			elementClass = url_hash.split('_')[1],
			contextClass = url_hash.split('_')[2],
			target		 = $('.' + elementClass, '.' + contextClass);
		
		// validate action name and do it.
		if ($.validateAnimationAction(action)) {
			if (elementClass.match(/^ov-.*/)) { // used on the client options (#admin-box)
				setTimeout(function(){
					$('a[rel='+ elementClass +']', '#admin-box').click();
				}, 1);
				
			} else {
				var context = $('.' + contextClass);
				var actionLink = $('.toggle_action', context);

				// change the state of the toggle_action link
				if (actionLink.length) $.switch_action_hash($('.toggle_action', context), action, elementClass, contextClass);

				if (scroll_to_it) $(document).scrollTo(context, 800);

				target[action]();
			}
		}
	}
	
}

// first implemented for the sortable nav bar to update position via ajax
$.updateModels = function(e, ui) {
	var list_items  = ui.item.parent().children(),
		$this		= $(ui.item),
		data 		= '';
			
	// build query string
	$(list_items).each(function(i){ // html element id is <ModelClass>_<int ID>
		var model_class = this.id.split('_')[0],
			model_id 	= this.id.split('_')[1],
			model_attr 	= $this.attr('rel'); // attribute to update
				
		data += 'models['+ i +'][model]='+ model_class + '&models['+ i +'][id]='+ model_id +
				'&models['+ i +'][attribute]='+ model_attr +'&models['+ i +'][value]='+ i + '&';
	});
	
	$.post('/ajax/update_many', data, function(response){
		if (response.success) {
			$this.effect('bounce', {}, 200);
		} else {
			$.ajax_error(response);
		}
	}, 'json');
}

// update attributes on a single model
$.updateModel = function(path, params, callback) {
	$.post(path, params, function(response){
		if (response.success) {
			if (typeof callback == 'function') callback.call(this, response.data);
			else alert(response.data);
			
		} else $.ajax_error(response);
		
	}, 'json');
}

// retrieve the attributes/columns of given resource/model, e.g. pages, users, posts
$.getModelAttributes = function(resource, callback) {
	var attributes = [];
	
	$.getJSON('/ajax/get_attributes?model='+ singularize(resource), function(response){
		if (response.success) {
			if (callback && typeof callback == 'function') callback.call(this, response.data);
			else return response.data;
			
		} else {
			$.ajax_error(response);
		}
	});
}

$.injectOptionsInSelectLists = function(field_name_selects, option_tag_html) {
	$.each(field_name_selects, function(){ $(this).html(option_tag_html) });
}

// cause the text_field to turn back into a label on blur, but leave behind a hidden field with its value
$.revertSettingsTextFieldToLabel = function(text_field, old_val) {
	text_field.blur(function(){
		var this_field 			= $(this),
				new_val					= this_field.val(),
				field_container = this_field.parent().parent(),
				setting_field 	= $('.setting_field input', field_container),
				old_field_name 	= setting_field.attr('name');

		this_field.fieldToLabel();
		
		// update the setting field name with the new value from the setting label
		setting_field.attr('name', old_field_name.replace(old_val.toLowerCase(), new_val.toLowerCase()))
		
		if (field_container.hasClass('new_setting_field')) {
			field_container.removeClass('new_setting_field').addClass('existing_setting_field');
		}
	});
}

$.mayContinue = function(link) {
	return !link.hasClass('before_confirm') || (link.hasClass('before_confirm') && confirm(link.attr('title')))
}

$.open_map = function(map) {
	map.show();
	
	var map_btn = $('#top_map_btn'),
		location = map_btn.attr('rel').split(','),
		lat = parseFloat(location[0]),
		lng = parseFloat(location[1]);

	$('span', map_btn).text('Hide Map');
	Gmap.checkResize();
	Gmap.setCenter(new GLatLng(lat, lng), 12);
}

/******************************************* JQUERY PLUGINS *******************************************/
$.fn.disabler = function(d) { // master switch checkbox, disables all form inputs when unchecked
	var disablees = d || 'input, textarea, select, checkbox, radio';
	return this.each(function(){
		var $this = $(this);
		
		$this.data('enabled', $this.is(':checked'));
		$.disable($this, disablees);
		
		$this.change(function(){ $.disableToggle($this, disablees) });
	});
}

// watches for anchors in window.location that have valid a element id in spot1 of the hash (#[spot1]_spot2)
// toggle open the container with that id and if theres a valid id in spot2 scroll to on an anchor with id == spot2
$.fn.anchorDispatch = function() {
	var url_hash, listeningElement, anchor;
	
	url_hash = window.location.href.split('#')[1];
	if (!url_hash) 
		return false;
	
	if ($.validateAnimationAction(url_hash.split('_')[0])) 
		return false
	
	listeningElement = $('#' + url_hash.split('_')[0]);
	if (!listeningElement) 
		return false;

	if (url_hash.split('-')[1]) anchor = $('#' + url_hash.split('-')[1]);
	
	return this.each(function(i){
		if (this.id == listeningElement.attr('id')) {
			listeningElement.show();
			$('.collapseable', listeningElement).show().removeClass('hide');
			$('.toggle_action', listeningElement).addClass('toggle_down');
		}
		
		if (anchor) {
			$(document).scrollTo(anchor, 2000);
			$('#'+ url_hash.split('-')[0]).effect('highlight', { color: '#87c881' }, 7000);
		}
	});

} // END $.fn.anchorDispatch()

// click any where on a rowCheckable div to toggle the checkbox within the first child element
$.fn.rowCheckable = function() {
	return this.each(function() {
		var $this = $(this),
		 		checkbox = $('input[type=checkbox]', $this).eq(0);
		
		$this.live('click', function(e) { // trigger checkbox unless a link is clicked
			if (e.target.tagName == e.currentTarget.tagName) {
				checkbox.trigger('change').attr('checked', !checkbox.is(':checked'));
			}
		});
	});
}

// use a checkbox to switch between two containers. classes: .pane_0, .pane_1
$.fn.paneSwitcher = function() {
	return this.each(function() {
		var context = $(this).parent().parent().parent();
		this.checked ? $('#pane_0', context).hide() : $('#pane_1', context).hide();
		
		$(this).change(function() { // trigger checkbox unless a link is clicked
			$('.pane_switchable', context).slideToggle();
		});
	});
}

// use a checkbox to show/hide its parents next sibling div, focus on any child inputs there may be
$.fn.toggleDiv = function() {
	return this.each(function() {
		var $this = $(this);
		var sibling = $this.parent().next('.toggle_this');
		
		this.checked ? sibling.show() : sibling.hide();
		$this.change(function(){
			sibling.toggle(); 
			sibling.find('input, textarea, select').focus();
		});
	});
}

// converts an element (e.g. label) into a textfield when function is called, useful within a click or hover handler
$.fn.textFieldable = function(text_field_html, callback) {
	return this.each(function(){
		var $this 			= $(this),
				$text_field = $(text_field_html);

		$this.parent().html($text_field);
		$text_field.focus();
		
		// recall hinty
		$.bindPlugins();
		
		if (typeof callback == 'function') callback.call(this, $text_field);
	});
}

// oposite of textFieldable, but used exclusively when the original element is a label, used within a blur event handler
$.fn.fieldToLabel = function() {
	return this.each(function(){
			var $this = $(this),
					label = '<label for="'+ $this.attr('name') +'" class="block w110 small_round textFieldable">'+ $this.val() +'</label>';
			
			$this.parent().prepend(label);
			$this.remove();
	});
}

// hide element with a slide anim and remove from DOM
$.fn.slideUpAndRemove = function(speed) {
	if (typeof speed == 'null') speed = 300;
	
	return this.each(function(){
		var $this = $(this);
		$this.slideUp(speed, function(){ $this.remove(); });
	});
}

// animates from transparent to opaque on hover, css sets initial opacity
$.fn.animOpacity = function() {
	return this.each(function(){
		var $this				 = $(this),
				orig_opacity = $this.css('opacity');
				
		$this.hover(function(){
			$this.stop().animate({ 'opacity': 1 }, 300);
		}, function(){
			$this.stop().animate({ 'opacity': orig_opacity }, 150);
		});
	});
}

// attack a click event to divs that wrap a link to follow the href
$.fn.linkDiv = function() {
	return this.each(function(){
		var $this = $(this), href = $this.find('a').attr('href');
		$this.click(function(){ window.location = href; });
	});
}

// fill matching inputs with the param from its rel attr
$.fn.fillWithParam = function() {
	var params = window.location.href.split('?')[1];
	if (!params) return false;
	
	return this.each(function(){
		var $this = $(this),
				attr  = $this.attr('rel'),
				value = false;
		
		$.each(params.split('&'), function(){
			if (this.split('=')[0] == attr) { value = this.split('=')[1]; return; }
		});
		
		if (value) 
			$this.attr('value', decodeURIComponent(value.replace(/\+/g, '%20'))).removeClass('hint_text').attr('disabled', false);
		
		if ($this.hasClass('focus_me'))
			$this.focus();
	});
}

$.fn.appendParamAndGo = function() {
	return this.each(function(){
		var $this = $(this);
		
		$this.click(function(){
			var key   = $this.attr('rel').split('-')[0]
					val   = $this.attr('rel').split('-')[1],
					href	= window.location.href,
					new_href = '',
					has_param = href.indexOf('?') >= 0,
					param = (has_param ? '&' : '?') + key +'='+ val;
			if(!val) return false;
			
			// replace any preexisting param values if the key is present
			if (href.indexOf(key) >= 0) {
				new_href = href.split(key)[0].replace(/\&$/, '') + param;
			} else {
				new_href = href + param
			}
			
			// go if its a different button that was clicked
			if (href.indexOf(val) < 0)
				window.location = new_href;
		});
	});
}

// click a link to open a hidden div near by
$.fn.openDiv = function() {
	return this.each(function(){
		var $this = $(this),
			div_to_open = $this.attr('rel');
				
		$this.click(function() {
			$('#'+div_to_open).slideToggle(600);
			return false;
		});
	});
}

// make a link act as a submit button
$.fn.submitBtn = function() {
	return this.each(function() {
		var $this = $(this);
		
		$this.click(function(){
			$this.parents('form').submit();
			return false;
		})
	});
}

$.fn.accordion = function() {
	return this.each(function() {
		$(this).click(function() {
			var $this = $(this),
				info_div = $('.info', $this.parent().parent());
					
			$('a', $this.parent().parent().parent()).removeClass('active');
			$('.info').slideUp();
			
			if (info_div.is(':hidden')) {
				$this.addClass('active');
				info_div.slideDown().children().hide().fadeIn('slow');
			} else {
				$this.removeClass('active');
				info_div.slideUp();
			}
			
			return false;
		})
	});
}

$.fn.tabular_content = function() {
	return this.each(function(){
		var $this = $(this), // the container
				tabs = $('.tabular', $this), // ul
				panels = $('.tab_content', $this); // tab content divs
		
		tabs.find('li').eq(0).addClass('active');
		panels.eq(0).show();
				
		$('a', tabs).click(function(){
			$('li', tabs).removeClass('active')
			clicked_tab = $(this);
			clicked_tab.parent().addClass('active');
			
			panels.hide().removeClass('active');
			$('#'+ clicked_tab.attr('rel'), $this).show().addClass('active');
			
			return false;
		});
	});
}

$.fn.clickOnLoad = function() {
	return this.each(function(){
		$(this).click();
	});
}

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
				$(this).data('saving', false)
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
					if (response.success) {
						$('.value', $this).each(function(){
							var this_val   = $(this),
								this_input = $('input', this_val.parent()).hide();

							this_val.text(this_input.val()).fadeIn(1000);
						});
						
						submit_btn.text('Edit');
					} else alert(response.data);
					
					ajax_loader.hide();
					cancel_btn.fadeOut();
					$(this).data('saving', false)
					
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

// as the user types in numbers, the input is formated as XXX-XXX-XXXX
$.fn.formatPhoneNum = function() {
	return this.each(function(){
		$(this).keyup(function(e){
			var input = $(this),
				allowed_keys = [9, 8, 46]; // 9 = tab, 8 = backspace, 46 = delete
			
			if (e.which == 189 || e.which == 109) { // dash or substract
				input.val(input.val().substring(0, input.val().length - 1));
			}
			
			if (allowed_keys.indexOf(e.which) < 0 && isNaN(input.val().replace('-', '').replace('-', ''))) {
				input.val(input.val().substring(0, input.val().length - 1));
				
			} else if (allowed_keys.indexOf(e.which) < 0 && input.val().length >= 3 && input.val().length < 7 && input.val().indexOf('-') < 0) {
				input.val(input.val().substring(0, 3) + '-' + input.val().substring(3));
				
			} else if (allowed_keys.indexOf(e.which) < 0 && input.val().length >= 7 && input.val().indexOf('-') < 7) {
				input.val(input.val().substring(0, 7) + '-' + input.val().substring(8));
			}
		});
	});
}

// first implemented for the client sign up page (add your facility)
var GreyWizard = function(container, settings) {
	var self = this;
	self.form_data 	= {};
	self.settings 	= settings;
	self.slide_data = settings.slides;
	self.num_slides = self.slide_data.length;
	self.workflow 	= $(container);
	self.title_bar 	= $('#ui-dialog-title-pop_up', self.workflow.parent().parent());
	self.width	  	= self.workflow.width();
	self.height   	= self.workflow.height();
	self.slides   	= $('.'+ settings.slides_class, self.workflow).each(function(){ $(this).data('valid', true) });
	self.spacer		= 100;
	
	this.begin_workflow_on = function(step) {
		self.workflow.parents('#pop_up').show();
		self.nav_bar  	= $('#'+ settings.nav_id, self.workflow).children().hide().end(); // set initial nav state on each run
		
		self.current  	   = step || 0;
		self.current_slide = $('#'+ self.slide_data[self.current].div_id, self.workflow);
		self.skipped_first = step > 0 ? true : false;
		
		self.set_slides(true);
		
		// bind events
		self.nav_bar.find('.next, .skip').click(self.next);
		self.nav_bar.find('.back').click(self.prev);
		
		self.title_bar.change(function(){
			$(this).text(self.settings.title + ' - Step '+ (self.current+1));
		}).trigger('change');
		
		if (typeof self.slide_data[self.current].action == 'function') self.slide_data[self.current].action.call(this, self);
		self.set_nav();
	}
	
	this.set_slides = function(set_display) {
		if (typeof set_display == 'undefined') set_display = false;
		
		// arrange the slides so they are horizontal to each other, allowing for arbitrary initial slide number
		self.slides.each(function(i){
			// calculate the left position so that the initial slide is at 0
			var left = -((self.width + self.spacer) * ((self.current) - i))
			$(this).css({ position: 'absolute', top: 0, left: left +'px' });
		});
		
		if (set_display) { // build the slide tabbed nav
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
					else if (typeof action == 'string') btn[action]((action == 'hide' || action == 'show' ? null : self.settings.btn_speed));
				}
			});
		}
		
		setTimeout(function() {
			$('.slide_display', self.workflow.parent()).removeClass('active');
			$('#tab_step_'+ self.current, self.workflow.parent()).addClass('active');
		}, self.settings.fade_speed);
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
				$(this).stop().animate({ left: left + 'px' }, self.settings.slide_speed);
			});
			
			self.set_nav();
			self.slide_data[self.current].action.call(this, self);
			self.title_bar.trigger('change');
			
		} else if (self.current == self.num_slides-1) self.settings.finish_action.call(this, self);
	}
}

// NEW CLIENT Workflow (sign up through the add-your-facility page)
var workflow_settings = {
	slide_speed  : 1500,
	btn_speed	 : 900,
	fade_speed	 : 1000,
	title		 : 'Add Your Facility',
	slides_class : 'workflow_step',
	nav_id : 'workflow_nav',
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
	finish_action : function(wizard){ finish_workflow(wizard); }
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
			case 'first_name' : wizard.form_data.client['first_name'] = capitalize(this.value); break;
			case 'last_name' : wizard.form_data.client['last_name'] = capitalize(this.value); break;
			case 'listing_address' : wizard.form_data.mailing_address['address'] = this.value; break;
			case 'listing_city' : wizard.form_data.mailing_address['city'] = this.value; break;
			case 'listing_state' : wizard.form_data.mailing_address['state'] = this.value; break;
			case 'listing_zip' : wizard.form_data.mailing_address['zip'] = this.value; break;
			case 'listing_phone' : wizard.form_data.mailing_address['phone'] = this.value || ''; break;
			case 'wants_newsletter' : wizard.form_data.client[this.name] = this.checked; break;
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
			if (response.success) {
				wizard.workflow.parents('#pop_up').dialog('close');
				$('#top_fac_page').html(response.data);

			} else $.ajax_error(response);

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
function get_pop_up_and_do(sub_partial, pop_up_title, height, callback) {
	$.get('/ajax/get_multipartial?partial=/shared/pop_up&sub_partial='+ sub_partial, function(response){
		var pop_up = $(response).dialog({
			title: pop_up_title,
			width: 785,
			minHeight: 420,
			height: height,
			resizable: false,
			modal: true,
			close: function(){ $('.ajax_loader').hide(); $(this).dialog('destroy').remove();  }
		});
		
		if (typeof callback == 'function') callback.call(this, pop_up);
	});
}

/******************************************* SUCCESS CALLBACKS *******************************************/

$.toggleHelptext = function(clickedLink) {
	// if the link has a rel attribute, we are going to show the inner div of the container with class == rel
	$('.inner', '.' + clickedLink.attr('rel')).stop().slideToggle().toggleClass('hide');
	$('.ajax_action', clickedLink.parent()).toggleClass('hide');
	clickedLink.parent('.helptext_options').toggleClass('bg_green');
}

/******************************************* EVENT HANDLERS *******************************************/
// used to rebind the plugin to elements loaded into the DOM dynamically or through AJAX
$.bindPlugins = function() {
	$('.hintable').hinty(); // all matched inputs will display their title attribute
	$('form').formBouncer(); // form validation, fields with supported validation classes will be processed
}

/**************** some utility functions ****************/

// fill up the field_name select tag in the forms new/edit page
function fillInFormFieldSelectLists(resource) {
	var $field_name_selects = $('.field_attr_name', '#form_builder');
			
	// show progress indicator in field name select lists
	$.injectOptionsInSelectLists($field_name_selects, '<option>Loading..</option>');
	
	// get the options and then inject them as option tags into all the select lists
	$.getModelAttributes(resource, function(attributes){
		$.injectOptionsInSelectLists($field_name_selects, $.option_tags_from_array(attributes));
		
		// in the form edit page, triggering this custom event invokes the function that selects the correct field name
		// in each of the fields field_name select list
		$field_name_selects.trigger('filled');
	});
}

function capitalize(string) {
	if (typeof string != 'undefined') {
		return string.substring(0,1).toUpperCase() + string.substring(1);
	}
}

function titleize(string) {
	if (typeof string != 'undefined') {
		var parts = string.split(' '),
			titleized = '';
	
		for (var i = 0, len = parts.length; i < len; i++) {
			titleized += capitalize(parts[i])
			if (i < len) titleized += ' ';
		}
	
		return titleized;
	}
}

/**************** adapter functions ****************/

// Ajaxful ratings uses Prototype's Ajax object, since we don't use Prototype, create it and wrap a jQuery function in it
var Ajax = function(){};
Ajax.Request = function(url, params) {
	$.post(url, params.parameters);
}