/**
 * Custom jQuery 1.3.2 plugin
 * formBouncer by Diego Salazar, Oct. 2009
 * diego at greyrobot dot com
 * 
 */

jQuery.fn.formBouncer = function(){
	return this.each(function(){
		jQuery(this).live('submit', function() {
			$('.invalid', this).removeClass('invalid');
			$('.error', this).remove();
			
			return $(this).runValidation().data('valid');
		});
	});
}

jQuery.fn.runValidation = function(silent) {
	var valid_email = /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/,
		valid_phone = /^\(?(\d{3})\)?[- ]?(\d{3})[- ]?(\d{4})$/,
		valid_date = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/,
		valid_zip = /\d{5}/,
		numeric_class_regex = /(numeric_)/,
		form  = $(this),
		silent = silent || form.hasClass('silent');
		errors = '';
		
	function valid_credit_card(value) {
		// accept only digits, dashes or spaces
		if (/[^0-9-\s]+/.test(value)) return false;
			
		var nCheck = 0,
			nDigit = 0,
			bEven = false;

		value = value.replace(/\D/g, "");

		for (n = value.length - 1; n >= 0; n--) {
			var cDigit = value.charAt(n),
				nDigit = parseInt(cDigit, 10);
			
			if (bEven) {
				if ((nDigit *= 2) > 9)
					nDigit -= 9;
			}
			
			nCheck += nDigit;
			bEven = !bEven;
		}

		return (nCheck % 10) == 0;
	}
	
	function password_input_exists(form) {
		return jQuery('input[type=password]', form).length > 0
	}
	
	function error_html(input, msg) {
		if (form.hasClass('less_verbose')) {
			return '<p>'+ msg +'</p>';
		} else {
			var name = input.attr('name').split('[');
			name = name[name.length-1].replace(']', '').replaceAll('_', ' ');
			return '<p>' + capitalize(name) + ' '+ msg +'.</p>';
		}
	}

	function markInvalid(input, form) {
		if (!input.hasClass('invalid')) input.addClass('invalid').removeClass('hint_text');
		$('.invalid', form).eq(0).focus();

		$('.invalid', form).blur(function(){
			$(this).parent().runValidation(form.hasClass('silent'));
		});
	}
	
	function is_numeric(input) {
		return numeric_class_regex.test(input.attr('class'));
	}
	
	// remove previous errors
	$('.error', form).remove();

	jQuery('input, select, textarea', form).each(function(){
		var input = jQuery(this).removeClass('invalid'), 
			error = '';
		
		if (!input.attr('disabled')) {
			
			if (input.hasClass('required')) {
				if (input.is(':checkbox') && !input.is(':checked')) {
					error = error_html(input, 'must be checked');
					markInvalid(input, form);
					
				} else if (input.is(':radio') && !$('input[name='+ input.attr('name') +']:checked').length) {
					error = '<p>pick one</p>';
					markInvalid(input, form);
					
				} else if (input.val() == '' || input.val() == input.attr('title')) {
					error = error_html(input, 'is required');
					markInvalid(input, form);
				}
				
				errors += error;
			}

			if (input.hasClass('email') && (input.val() != '' && valid_email.test(input.val()) == false)) {
				error = error_html(input, 'is not valid');
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
				} else if (input.hasClass('numeric_zip') && !valid_zip.test(input.val())) {
					error = error_html(input, 'must be a 5 digit zip');
					markInvalid(input, form);
				}
				errors += error;
			}

			if (input.hasClass('confirm') && password_input_exists(form) && jQuery('input[type=password]', form)[0].value != input.val() ) {
				error = '<p>Passwords do not match.</p>';
				errors += error;
				markInvalid(input, form);
			}
			
			if(input.hasClass('credit_card') && !valid_credit_card(input.val())) {
				error = error_html(input, 'is invalid');
				errors += error;
				markInvalid(input, form);
			}
		}
		
		if (error != '' && !silent) {
			jQuery('.error', input.parent()).remove();
			input.before('<div class=\'flash error hidden\'>' + error + '</div>');
			jQuery('.error', input.parent()).slideDown();
		}

	});

	errors != '' ? form.data('valid', false) : form.data('valid', true);
	
	return form;
}