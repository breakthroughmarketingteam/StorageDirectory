// for the admin side of GreyCMS
$(function(){
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
	$.liveSubmit('.search-btn', '.search-button', '.submit_btn'); // make a link act as a submit button
	$('h4 a', '#info-accordion').accordion(); // my very own accordion widget :)
	$('.tabular_content').tabular_content(); // a div that contains divs as the tabbed content, the tab list can be anywhere
	$('.clickerd').clickOnLoad();             // a click is triggered on page load for these elements
	$('.numeric_phone').formatPhoneNum();     // as the user types in numbers, the input is formated as XXX-XXX-XXXX
	$('.tip_trigger').tooltip();
	$('.txt_ldr').txt_loader();
	$('.shimmy').shimmy();
	
	$('.focus_onload').eq(0).focus();
	// highlight text within a text field or area when focused
	$('.click_sel').live('focus', function() { $(this).select() });
	
	$('.greyConfirm').live('click', function() {
		$.greyConfirm('Are you sure?', function() {
			return true;
		}, function() {
			return false;
		});
	});
	
	// we call the toggleAction in case we need to trigger any plugins declared above
	$.toggleAction(window.location.href, true); // toggle a container if its id is in the url hash
	
	// sortable nav bar, first implemented to update the position attr of a page (only when logged in)
	$('.sortable', '.admin').sortable({
		opacity: 0.3,
		update: function(e, ui) { $.updateModels(e, ui) }
	});
	
	$('.block_sortable', '.admin').sortable({
		opacity: 0.3,
		placeholder: 'ui-state-highlight',
		helper: 'clone',
		update: function(e, ui) { $.updateModels(e, ui) }
	});
	
	if ($('.mini_calendar').length > 0) {
		$('.mini_calendar').datepicker();
		$('.datepicker_wrap').live('click', function(){ $('.mini_calendar', this).focus(); });
	}
	
	$('ul li a', '#ov-reports-cnt').click(function(){
		get_pop_up(this);
		return false;
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
		
	}).siblings('label').live('click', function(){
		var $this = $(this);
		
		$this.click(function(){
			$this.siblings('.selectable').eq(0).click();
		});
	});
	
	var radios = $('.radio_wrap').each(function() {
		var $this = $(this);
		if ($this.children('.radio_select').children(':radio').is(':checked'))
			$this.addClass('selected').find('.radio_select').find(':radio').attr('checked', true);
	});
	radios.live('click', function() {
		var $this = $(this);
		$this.siblings().removeClass('selected').find('.radio_select').find(':radio').attr('checked', false);
		$this.addClass('selected').find('.radio_select').find(':radio').attr('checked', true);
	});
	
	// Admin index page menu
	if ($.on_page([['index', 'admin']])) {
		var admin_links = $('a', '#controller_list'), 
			ajax_wrap = $('#ajax_wrap');
		
		admin_links.live('click', function(){ $.cookie('active_admin_link', this.id) });
		
		// ajaxify the admin links to inject the index view content into the #ajax_wrap, exclude certain ajax_links
		$('a:not(.ajax_action, .toggle_action, .partial_addable, .add_link, .cancel_link, .click_thru, .ps, .btn)', '#admin_panel').live('click', function() {
			var $this = $(this);
			
			if ($this.hasClass('admin_link')) {
				admin_links.removeClass('active');
				$this.addClass('active');
			}
			
			ajax_wrap.children().fadeTo('fast', 0.2);
			ajax_wrap.addClass('loading').load($this.attr('href') + ' #ajax_wrap_inner', function(response, status) {
				if (status == 'success') {
					$.bindPlugins();
					fillInFormFieldSelectLists($('#form_controller', '#FormsForm').val());
				}
				else $('#ajax_wrap_inner').html(response);
				
				$(this).removeClass('loading').children().hide().fadeIn('fast');
			});
			
			return false;
		});
		
		// ajaxify form submissions
		// TODO: respond_to blocks for all the controllers
		$('form', '#ajax_wrap').live('submit', function() {
			var form = $(this);
			
			ajax_wrap.children().fadeTo('fast', 0.2);
			ajax_wrap.addClass('loading');

			form.ajaxSubmit({
				target: '#ajax_wrap',
				success: function(response, status) {
					if (status == 'success') setTimeout(function() {
						$('.flash', '#ajax_wrap_inner').slideUpRemove('slow'); 
					}, 7000);

					ajax_wrap.removeClass('loading').children().hide().fadeIn('fast');
				}
			});
			
			return false;
		});
		
		// Clients#show: quick verify listings
		$('#client_verify', '#ov-member').live('click', function() {
			var $this = $(this),
				ajax_loader = $.new_ajax_loader('after', this);
			
			if (!$this.data('sending')) {
				ajax_loader.show();
				$this.data('sending', true);
				
				$.post(this.href, { authenticity_token: $.get_auth_token() }, function(response) {
					$.with_json(response, function(data) {
						$this.fadeOutRemove('fast');
					}, function() {
						$this.data('sending', false);
					});
					
					ajax_loader.fadeOutRemove('fast');
				}, 'json');
			}
			
			return false;
		});
		
		if ($.cookie('active_admin_link')) $('#'+ $.cookie('active_admin_link')).click();
	}
	
	// helpers
	$('.unique_checkbox').live('click', function() {
		var $this = $(this);
		$('input[type=checkbox]', $this.parent().parent().parent()).attr('checked', false);
		$this.attr('checked', !$this.is(':checked'))
	});
	
	$('.unique_checkbox').live('click', function() {
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
	$('.toggle_action').live('click', function() {
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
		
		$.mayContinue($this, function() {
			$.getJSON($this.attr('href') + '&authenticity_token=' + $.get_auth_token(), function(response) {
				$this.removeClass('loading');
				
				if (response.success) {
					// need better conditional logic for these links
					if ($this.attr('rel') == 'helptext') {
						$.toggleHelptext($this);
						
					} else if ($this.hasClass('delete_link')) {
						$this.parent().parent().slideUpRemove();
						
					} else if ($this.hasClass('rm_field')) { // first used for the estaff emails in the listing edit page
						$this.parent().fadeOutRemove(600);
					}
					
				} else {
					$.ajax_error(response);
					$this.removeClass('loading');
				}
			});
		}, function() { // else
			$this.removeClass('loading'); 
		});
		
		return false;
	});
	
	$('.post_link').live('click', function() {
		var $this = $(this);
		
		$.mayContinue($this, function() {
			$this.addClass('loading');
			
			$.post($this.attr('href') + '&authenticity_token=' + $.get_auth_token(), function(response) {
				$.with_json(response, function(data) {
					$this.parent().fadeOutRemove(600);
				});
				
				$this.removeClass('loading');
				
			}, 'json');
		});
		
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
		$(this).parent().parent().slideUpRemove(); 
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
		
		$.mayContinue($this, function() {
			if ($this.attr('rel').split('_')[1] == '0') $this.parent().parent().slideUpAndRemove();
			else $('#'+ $this.attr('rel')).slideUpAndRemove();
		});
		
		return false;
	});
	
	$('.select_on_focus').live('focus', function() {
		$(this).select();
	})
	
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
		$('.scope_dropdown', '#scope_fields').live('change', function(){
			var $this = $(this);
			
			if ($this.val() != '') { // retrieve all models of this class
				scoping_fields.show(100);
				scoping_dropdown = $('.scoping_dropdown', scoping_fields);
				scoping_dropdown.html('<option>Loading ' + $this.val() + '...</option>');
				
				$.getJSON('/ajax/get_all', { model: $this.val(), authenticity_token: $.get_auth_token() }, function(response) {
					if (response.success) {
						var args = { attribute: 'name', select_prompt: (scoping_dropdown.hasClass('no_prompt') ? '' : 'Active Context') }
						var option_tags = $.option_tags_from_model($this.val(), response.data, args);
						scoping_dropdown.html(option_tags);
						
					} else {
						scoping_dropdown.html('<option>Error Loading Records</option>')
					}
				});
			} else scoping_fields.hide(300);
		}); // END .scope_dropdown.change()
		
		// get the attributes of the resource selected from #form_controller in the form new/edit page
		$('#form_controller', '#FormsForm').live('change', function(){
			fillInFormFieldSelectLists($(this).val()); 
		});
		
		// create a custom event on the select lists so that when they finish loading the options, we can select the
		// field's field_name that matches in the list
		$('.field_attr_name', '#form_builder').live('filled', function(){
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
	
	$('#blast_off').live('click', function() {
		var $this = $(this),
			blast_type = $('input[name=blast_type]:checked', '#blaster').val(),
			test_emails = $('#test_emails', '#blaster').val(),
			ajax_loader = $.new_ajax_loader('after', $this).show();
		
		if (!$this.data('blasting')) {
			$this.data('blasting', true);
			
			$.getJSON($this.attr('data-blast-path'), { blast_type: blast_type, test_emails: test_emails, authenticity_token: $.get_auth_token() }, function(response) {
				$.with_json(response, function(data) {
					$.greyAlert(data, false);
				});
				
				$this.data('blasting', false);
				ajax_loader.hide();
			});
		}
		
		return false;
	});
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

$.with_json = function(response, success, error) {
	if (response.success) success.call(this, response.data);
	else if (error && error.call) error.call(this, response.data)
	else $.ajax_error(response);
}

$.log = function(msg) {
	typeof(console != 'undefined') ? console.log(msg) : alert(msg);
}

$.ajax_error = function(response) {
	if (typeof console == 'undefined') $.greyAlert((typeof(response.data) == 'undefined' ? response : response.data));
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
		actions 	= route_sets[i][0].split(/,\W?/);
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
		['show',			'hide'],
		['fadeIn',		 'fadeOut'],
		['slideDown',	 'slideUp'],
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
		var url_hash = url_hash[1],
	 		action	 = url_hash.split('_')[0],
			element  = url_hash.split('_')[1],
			context  = url_hash.split('_')[2],
			target	 = $(element, context);
			
		// validate action name and do it.
		if ($.validateAnimationAction(action)) {
			if (element.match(/^ov-.*/)) { // used on the client options (#admin-box)
				setTimeout(function(){
					$('a[rel='+ element +']', '#admin-box').click();
				}, 1);
				
			} else {
				var oContext = $(context);
				var actionLink = $('.toggle_action', oContext);
				
				// change the state of the toggle_action link
				if (actionLink.length) $.switch_action_hash($('.toggle_action', oContext), action, element, context);
				try {
					if (scroll_to_it) $(document).scrollTo(oContext, 800);
				} catch (e) { }
				
				target[action]();
			}
		}
	}
	
}

// first implemented for the sortable nav bar to update position via ajax
$.updateModels = function(e, ui, callback) {
	var list_items  = ui.item.parent().children(),
		$this		= ui.item,
		query 		= '';
			
	// build query string
	$(list_items).each(function(i){ // html element id is <ModelClass>_<int ID>
		var model_class = this.id.split('_')[0],
			model_id 	= this.id.split('_')[1],
			model_attr 	= $this.attr('rel'); // attribute to update
				
		query += 'models['+ i +'][model]='+ model_class + '&models['+ i +'][id]='+ model_id +
			     '&models['+ i +'][attribute]='+ model_attr +'&models['+ i +'][value]='+ i + '&';
	});
	
	$.post('/ajax/update_many', query, function(response){
		$.with_json(response, function(data) {
			if (typeof callback == 'function') callback.call(this, data);
			else $this.effect('bounce', {}, 200);
		});
	}, 'json');
}

// update attributes on a single model
$.updateModel = function(path, params, callback) {
	$.post(path, params, function(response){
		$.with_json(response, function(data){
			if (typeof callback == 'function') callback.call(this, data);
			else alert(data);
		});
	}, 'json');
}

// retrieve the attributes/columns of given resource/model, e.g. pages, users, posts
$.getModelAttributes = function(resource, callback) {
	var attributes = [];
	
	$.getJSON('/ajax/get_attributes?model='+ singularize(resource), function(response){
		$.with_json(response, function(data){
			if (callback && typeof callback == 'function') callback.call(this, data);
			else return data;
		});
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

$.any = function(arr, callback) {
	var has = false;
	$.each(arr, function(i) {
		if (callback.call(this, i)) {
			has = true;
			return;
		}
	});
	return has;
}

$.disable_submit_btn = function(btn) {
	return $.toggle_submit_btn(btn, true, .5);
}

$.activate_submit_btn = function(btn) {
	return $.toggle_submit_btn(btn, false, 1);
}

$.toggle_submit_btn = function(btn, toggle, fade) {
	return $(btn).attr('disabled', toggle).fadeTo(300, fade);
}


$.mayContinue = function(link, callback, else_callback) {
	if (!link.hasClass('before_confirm') || (link.hasClass('before_confirm') && $.greyConfirm(link.attr('title'), callback))) {
		return true;
	} else if (typeof else_callback == 'function') {
		else_callback.call(this, link);
	}
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

$.get_param_value = function(key) {
	var query = window.location.href.split('?')[1];
	
	if (query) {
		var params = query.split('&'), value;
			
		$.each(params, function(){
			var key_val = this.split('=');
			
			if (key_val[0] == key) {
				value = key_val[1];
				return;
			}
		});
		
		return value;
	}
}

// replacement for the browser's confirm and alert box
// msg: what to show in the pop up. action: callback if yes. cancel: callback if no. alert: do alert box instead (with only 1 btn). error: whether the alert is an error or simple alert.
$.greyConfirm = function(msg, action, cancel, alert, error) {
	var pop_up = $('<div id="pop_up" class="'+ (typeof(alert) == 'undefined' || !alert ? 'confirm_box' : 'alert_box') +'"><p>' + msg +'</p>').dialog({ 
		title: alert ? (error ? 'Alert' : 'Notice') : 'Confirm',
		width: 400,
		height: 'auto',
		modal: true,
		resizable: false,
		close: function() { $(this).dialog('destroy') }
	});
	
	if (typeof(alert) != 'undefined') var btns = '<a href="#" id="alert_ok" class="btn">'+ (error ? 'Doh!' : 'Ok') +'</a></div>'; 
	else var btns = '<a href="#" id="confirm_yes" class="btn">Yes</a><a href="#" id="confirm_cancel" class="btn">Cancel</a></div>';
	pop_up.append(btns);
	
	$('.btn', pop_up).click(function() {
		if (typeof(alert) == 'undefined' || !alert) {
			var confirm = $(this).text() == 'Yes' ? true : false;
			if (confirm && typeof(action) == 'function') action.call(this);
			else if (typeof cancel == 'function') cancel.call(this);
		}
		
		pop_up.dialog('destroy');
		return false;
	});
}

// msg: what to show in the pop up. error: boolean, error or just simple alert
$.greyAlert = function(msg, error) {
	if (typeof error == 'undefined') error = true;
	$.greyConfirm(msg, null, null, true, error);
}

$.ajax_loader_tag = function(img, context) {
	if (typeof img == 'undefined') var img = 'ajax-loader-facebook.gif';
	var id = typeof(context) == 'undefined' ? '' : 'al_'+ context.attr('id');
	return '<img src="/images/ui/'+ img +'" alt="Loading..." class="ajax_loader" id="'+ id +'" />';
}

$.ajax_loaders = [];
// put a new ajax loader somewhere by calling a jquery method on the el
$.new_ajax_loader = function(where, el, img) {
	el = $(el);
	var a = $($.ajax_loader_tag(img, el));
	
	try {
		el[where](a);
		$.ajax_loaders.push(a);
		return a;
		
	} catch(e) {
		$.log('new ajax loader failed: '+ e);
	}
}

$.setInterval = function(callback, interval) {
	setTimeout(function() {
		callback.call(this);
		setTimeout(arguments.callee, interval);
	}, interval)
}

$.setup_autocomplete = function(els, context) {
	if (typeof els == 'undefined') var $autocompleters = $('.autocomplete');
	else if (els && typeof(context) == 'undefined') var $autocompleters = $(els);
	else var $autocompleters = $(els, context);
	
	var $autcompleted = {};
	
	if ($autocompleters.length > 0) {
		$autocompleters.each(function(){
			var $this   = $(this), rel = $this.attr('rel'),
				info	= rel.split('|')[0],
				minLen	= rel.split('|')[1],
				model   = info.split('_')[0],
				method  = info.split('_')[1];

			if (!$autcompleted[rel]) {
				$.getJSON('/ajax/get_autocomplete', { 'model': model, 'method': method }, function(response){
					if (response.success && response.data.length > 0) { 
						$autcompleted[rel] = response.data;
						$this.autocomplete({
							source: response.data,
							minLength: minLen
						});
					} else $.ajax_error(response);
				});
			}
		});
	}
}

// uses the jquery plugin sortElement
var stuff_sort_inverse = false;
$.sort_stuff = function(sort_link, elements, selector, sortFunc) {
	sort_link.addClass(stuff_sort_inverse ? 'down' : 'up');
	sort_link.removeClass(stuff_sort_inverse ? 'up' : 'down');
	
	elements.sortElements(function(a, b) {
		return sortFunc(a, b);

	}, function() {
		return $(this).children(selector)[0];
	});
	
	stuff_sort_inverse = !stuff_sort_inverse;
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

// attach a click event to divs that wrap a link to follow the href
$.fn.linkDiv = function() {
	return this.each(function(){
		var $this = $(this), href = $this.find('a').attr('href');
		$this.click(function(){ if (href) window.location = href; });
	});
}

// fill matching inputs with the param from its rel attr
$.fn.fillWithParam = function() {
	var params = window.location.href.split('?')[1];
	if (!params) return false;
	
	return this.each(function(){
		var $this = $(this), value = false, 
			attr  = $this.attr('param') || $this.attr('rel');
		
		$.each(params.split('&'), function(){
			if (this.split('=')[0] == attr) {
				value = this.split('=')[1];
				return;
			}
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
			$this.parent('.bg').toggleClass('expanded');
			if ($this.hasClass('toggle_right')) $this.toggleClass('toggle_down');
			return false;
		});
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
	function what_action(el) {
		if (el.hasClass('slide')) 	  return ['slideUp', 'slideDown', 'slow'];
		else if (el.hasClass('fade')) return ['fadeOut', 'fadeIn', 'slow'];
		else 						  return ['hide', 'show', null];
	}
	
	return this.each(function(){
		var $this = $(this), // the container
			tabs = $('.tabular'), // ul
			panels = $('.tab_content', $this), // tab content divs
			action = what_action($this);
		
		tabs.find('li').eq(0).addClass('active');
		panels.eq(0).show();
				
		$('a', tabs).click(function(){
			panels[action[0]](action[2]).removeClass('active');
			$('li, a', tabs).removeClass('active');
			$(this).addClass('active').parent().addClass('active');
			$('#'+ $(this).attr('rel'), $this)[action[1]]((action[0] == 'hide' ? null : 'slow')).addClass('active');
			return false;
		});
	});
}

// make matched elements act as a submit button
$.liveSubmit = function() {
	$.each(arguments, function(){
		$(eval("'"+ this +"'")).live('click', function(){
			$(this).parents('form').submit();
			return false;
		});
	});
}

$.fn.clickOnLoad = function() {
	return this.each(function(){
		$(this).click();
	});
}

// as the user types in numbers, the input is formated as XXX-XXX-XXXX
$.fn.formatPhoneNum = function() {
	if ($.browser.msie) return;
	
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

// save a form's state to be used by the date_changed method
$.fn.save_state = function() {
	return this.each(function(){
		var form = $(this);
		form.data('state', form.serialize());
	});
}

// check previously saved state against the current one and return true if changed
$.fn.state_changed = function() {
	var prev_state = this.data('state');
	if (!prev_state) return false;
	return prev_state != this.serialize();
}

// a textual loading animation
$.fn.txt_loader = function(options) {
	function increment_txt(el, txt) {
		var t = el.text();
		el.text(t + txt);
	}
	
	return this.each(function() {
		var $this = $(this).text(''),
			count = 0,
			settings = {
				txt : '.',
				interval : 1000,
				limit : 3
			};
		
		if (typeof options == 'undefined')
			var options = {}
		
		$.extend(settings, options);
		
		setInterval(function() {
			if (count < settings.limit) {
				increment_txt($this, settings.txt);
			} else {
				$this.text('');
				count = -1;
			}
			
			count++;
		}, settings.interval);
	});
}

$.fn.shimmy = function() {
	return this.each(function() {
		
	});
}

$.fn.slideUpRemove = function(speed) {
	$.fn.animAndRemove.call(this, 'slideUp', speed);
}

$.fn.fadeOutRemove = function(speed) {
	$.fn.animAndRemove.call(this, 'fadeOut', speed);
}

$.fn.animAndRemove = function(anim, speed) {
	return this.each(function() {
		$(this)[anim](speed || 'fast', function() { $(this).remove(); });
	});
}

// focus on next input when current input reaches maxlength
$.fn.autoNext = function() {
	return this.each(function() {
		var $this = $(this);
		if (typeof $this.attr('maxlength') == 'undefined') return;
		
		var form = $this.parents('form'),
			inputs = $('input, textarea, select', form);
		
		$this.keyup(function() {
			var input = $(this);
			
			if (input.val().length == input.attr('maxlength') && input.val() != input.attr('title'))
				inputs.eq(inputs.index(input) + 1).focus();
		});
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
	
	if ($field_name_selects.length) {
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

function default_pop_up_options(options) {
	return {
		title: 	   options.title,
		width: 	   options.width || 785,
		height:    options.height,
		resizable: false,
		modal: 	   options.modal,
		close: 	   function() {
			$('.ajax_loader').hide();
			$(this).dialog('destroy').remove();
		}
	};
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
		if (typeof callback == 'function') callback.call(this, response);
	});
}

/**************** slide show and workflow object *******************/
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

// first implemented for the client sign up page (add your facility), now also used for the US Map and the Reservation process
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
	self.pad_left	= settings.pad_left || 15; // to align the slides away from the left wall of the workflow wrapper
	self.slide_speed = settings.slide_speed || 1500,
	self.btn_speed  = settings.btn_speed || 900,
	self.fade_speed = settings.fade_speed || 1000,
	
	this.begin_workflow_on = function(step) {
		self.workflow.parents('#pop_up').show();
		self.nav_bar  	   = $('#'+ (self.nav_id || 'workflow_nav'), self.workflow).children().hide().end(); // set initial nav visibility
		self.current  	   = step || 0;
		self.current_slide = $('#'+ self.slide_data[self.current].div_id, self.workflow);
		self.skipped_first = step > 0 ? true : false;
		
		self.set_slides();
		self.set_nav();
		
		// bind events
		self.nav_bar.find('.next, .skip').click(self.next);
		self.nav_bar.find('.back').click(self.prev);
		
		if (self.title_bar.length) self.title_bar.change(function(){
			if (self.slide_data[self.current].pop_up_title) $(this).text(self.slide_data[self.current].pop_up_title);
			else $(this).text(self.settings.title);
		}).trigger('change');
		
		if (typeof self.slide_data[self.current].action == 'function') self.slide_data[self.current].action.call(this, self);
	}
	
	// TODO: find jquery scrolling slider to make this animation smoother
	this.set_slides = function() {
		if (typeof set_display == 'undefined') set_display = false;
		
		// arrange the slides so they are horizontal to each other, allowing for arbitrary initial slide number
		/*/self.slides.each(function(i) {
			// calculate the left position so that the initial slide is at 0
			var left = -((self.width + self.spacer) * (self.current - i))
			$(this).css({ position: 'absolute', top: 0, left: (left + self.pad_left) +'px' });
		});*/
		
		// give the slides some space between each other
		self.slides.css({ 'margin-right': self.spacer +'px' });
		
		// jquery tools scrollable
		self.workflow.children('.items').width(self.num_slides * (self.width + self.spacer + self.pad_left) + 3);
		self.workflow.scrollable({ speed: 1000, circular: false, next: '.none', prev: '.none' }).data('scrollable').seekTo(self.current, 1);
		
		if (self.settings.set_slides) { // build the slide tabbed display
			self.slide_steps = $('<div id="slide_nav" />').appendTo(self.workflow.parent())
			var step_display 	 = '',
				active_slides 	 = self.num_slides - (self.skipped_first ? 1 : 0),
				slide_tab_width  = parseInt(100 / active_slides) - (self.skipped_first ? 3 : 2.68), // tested in FF 3.6
				done_skipping 	 = false;
			
			for (var i = 0; i < self.num_slides; i++) {
				if (self.skipped_first && !done_skipping) {
					done_skipping = true; 
					continue; 
				}
				
				step_display += '<div id="tab_step_'+ i +'" class="slide_display '+ (self.current == i ? ' active' : '') + (i == (self.skipped_first ? 1 : 0) ? ' first' : (i == self.num_slides-1 ? ' last' : '')) +'" style="width:'+ slide_tab_width +'%;">'+
									'<p>Step '+ (i+1) +'</p>'+
									(typeof self.slide_data[i].slide_display != 'undefined' ? self.slide_data[i].slide_display : '') +
								'</div>';
			}
			self.slide_steps.html(step_display);
		}
	}
	
	this.set_nav = function() {
		if (typeof self.slide_data[self.current] != 'undefined') {
			$.each(self.slide_data[self.current].nav_vis, function(){ // get the current slide's nav actions
				var btn = $('.'+ this[0], self.nav_bav),
					action = this[1];
			
				if (action) {
					if (typeof action == 'function') action.call(this, btn, self); 
					else if (typeof action == 'string') btn[action]((action == 'hide' || action == 'show' ? null : self.btn_speed));
				}
			});
		}
		
		if (self.settings.set_slides) setTimeout(function() {
			$('.slide_display', self.workflow.parent()).removeClass('active');
			$('#tab_step_'+ self.current, self.workflow.parent()).addClass('active');
		}, self.fade_speed);
	}
	
	this.may_move = function(step) {
		var validated = true;
		
		if (typeof self.slide_data[self.current].validate == 'function' && step > 0) 
			validated = self.slide_data[self.current].validate.call(this, self);
		
		return validated && ((self.current + step) >= 0 && (self.current + step) < self.num_slides) && (step < 0 || (step > 0 && !$('.next', self.workflow).data('done')));
	}
	
	this.next = function(step) {
		self.move(typeof(step) == 'number' ? step : 1);
		return false;
	}
	
	this.prev = function(step) {
		self.move(typeof(step) == 'number' ? step : -1);
		return false;
	}
	
	this.move = function(step) {
		if (self.may_move(step)) {
			//self.set_slides(); // this prevents the animation from knocking the positions off track if a user clicks nav buttons erratically
			if (step > 0) $('#tab_step_'+ self.current, self.workflow.parent()).addClass('done');
			self.current += step;
			
			/*self.slides.each(function(i){
				var left = (self.width + self.spacer) * (-step) + parseInt($(this).css('left'));
				$(this).stop().animate({ left: left + 'px' }, self.slide_speed);
			});*/
			
			self.workflow.data('scrollable').seekTo(self.current);
			
			self.set_nav();
			self.title_bar.trigger('change');
			
			if (typeof self.slide_data[self.current].action == 'function')
				self.slide_data[self.current].action.call(this, self);
			
		} else if (self.current == self.num_slides-1) {
			if (typeof(self.settings.finish_action) == 'function')
				self.settings.finish_action.call(this, self);
				
			else if (self.settings.finish_action == 'close')
				self.workflow.parent().dialog('close').remove();
		} 
	}
}

/**************** adapter functions ****************/

// Ajaxful ratings uses Prototype's Ajax object, since we don't use Prototype, create it and wrap a jQuery function in it
var Ajax = function(){};
Ajax.Request = function(url, params) {
	$.post(url, params.parameters);
}

String.prototype.replaceAll = function(find, replace) {
    var temp = this, index = temp.indexOf(find);
    while (index != -1) {
        temp = temp.replace(find, replace);
        index = temp.indexOf(find);
    }
    return temp;
}

function capitalize_addr(addr) {
	if (typeof addr != 'string') return;
	var capped = '',
		parts = addr.split(' '),
		dirs = ['ne', 'nw', 'se', 'sw'];
	
	$.each(parts, function(i) {
		if ($.inArray(this.toLowerCase(), dirs) >= 0)
			capped += this.toUpperCase();
		else
			capped += capitalize(this);
		
		if (i < parts.length - 1) capped += ' ';
	});
	
	return capped;
}