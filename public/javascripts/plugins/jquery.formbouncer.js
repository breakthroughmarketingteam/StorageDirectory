/**
 * Custom jQuery 1.3.2 plugin
 * formBouncer by Diego Salazar, Oct. 2009
 * diego at greyrobot dot com
 * 
 */

jQuery.fn.formBouncer = function(){
	return this.each(function(){
		jQuery(this).live('submit', function(){
			$('.invalid', this).removeClass('invalid');
			$('.error', this).remove();
			
			return $(this).runValidation().data('valid');
		});
	});
}

jQuery.fn.runValidation = function() {
	var valid_email = /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/,
		valid_phone = /^\(?(\d{3})\)?[- ]?(\d{3})[- ]?(\d{4})$/,
		valid_date = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/,
		numeric_class_regex = /(numeric_)/,
		form  = $(this),
		errors = '';

	function password_input_exists(form) {
		return jQuery('input[type=password]', form).length > 0
	}
	
	function error_html(input, msg) {
		var name = input.attr('name').split('[');
		name = name[name.length-1].replace(']', '').replaceAll('_', ' ');
		return '<p>' + capitalize(name) + ' '+ msg +'.</p>';
	}

	function markInvalid(input, form) {
		if (!input.hasClass('invalid')) input.addClass('invalid');
		jQuery('.invalid', form).eq(0).focus();

		jQuery('.invalid', 'form.silent').blur(function(){ jQuery(this).removeClass('invalid'); });
	}
	
	function is_numeric(input) {
		return numeric_class_regex.test(input.attr('class'));
	}

	jQuery('input, select, textarea', form).each(function(){
		var input = jQuery(this),
			error = '';

		input.removeClass('invalid');
		
		if (!input.attr('disabled')) {
			
			if (input.hasClass('required') && ((input.val() == '' || input.val() == input.attr('title') || input.attr('type') == 'checkbox' && !input.is(':checked'))) ) {
				error = error_html(input, 'is required');
				errors += error;
				markInvalid(input, form);
			}

			if (input.hasClass('email') && valid_email.test(input.val()) == false) {
				error = error_html(input, 'is not a valid email');
				errors += error;
				markInvalid(input, form);
			}

			if (is_numeric(input)) {
				if (input.hasClass('numeric_phone') && !valid_phone.test(input.val())) {
					error = error_html(input, 'must be a valid US phone number w/ area code');
					markInvalid(input, form);
				} else if (input.hasClass('numeric_date') && !valid_date.test(input.val())) {
					error = error_html(input, 'must be a valid date: mm/dd/yyyy');
					markInvalid(input, form);
				}
				errors += error;
			}

			if (input.hasClass('confirm') && password_input_exists(form) && jQuery('input[type=password]', form)[0].value != input.val() ) {
				error = '<p>Passwords do not match.</p>';
				errors += error;
				markInvalid(input, form);
			}
		}
		
		if (error != '' && !form.hasClass('silent')) {
			jQuery('.error', input.parent()).remove();
			input.before('<div class=\'flash error hidden\' style=\'float:'+ input.css('float') +'\'>' + error + '</div>');
			jQuery('.error', input.parent()).slideDown();
		}

	});

	errors != '' ? form.data('valid', false) : form.data('valid', true);
	
	return form;
}