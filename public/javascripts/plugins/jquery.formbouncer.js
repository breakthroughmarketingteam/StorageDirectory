/**
 * Custom jQuery 1.3.2 plugin
 * formBouncer by Diego Salazar, Oct. 2009
 * diego at greyrobot dot com
 * 
 */

jQuery.fn.formBouncer = function(){
	return this.each(function(){
		jQuery(this).submit(function(){
			$('.invalid', this).removeClass('invalid');
			$('.error', this).remove();
			
			var validated = $(this).runValidation();
			return validated.data('valid');
		});
	});
}

jQuery.fn.runValidation = function() {
	var valid_email = /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/,
		form  = $(this),
		errors = '';

	function password_input_exists(form) {
		return jQuery('input[type=password]', form).length > 0
	}

	function markInvalid(input, form) {
		if (!input.hasClass('invalid')) input.addClass('invalid');
		jQuery('.invalid', form).eq(0).focus();

		jQuery('.invalid', 'form.silent').blur(function(){ jQuery(this).removeClass('invalid'); });
	}
	
	function is_numeric(input) {
		alert(input.attr('class'))
		return input.attr('class')
	}

	jQuery('input, select, textarea', form).each(function(){
		var input = jQuery(this),
			error = '';

		input.removeClass('invalid');
		
		if (!input.attr('disabled')) {
			
			if (input.hasClass('required') && (input.val() == '' || input.val() == input.attr('title')) ) {
				error = '<p>' + input.attr('id').replace('_', ' ') + ' is required.</p>';
				errors += error;
				markInvalid(input, form);
			}

			if (input.hasClass('email') && valid_email.test(input.val()) == false) {
				error = '<p>' + input.attr('id').replace('_', ' ') + ' is not a valid email.</p>';
				errors += error;
				markInvalid(input, form);
			}

			if (input.hasClass('numeric') && isNaN(input.val())) {
				error = '<p>' + input.attr('id').replace('_', ' ') + ' must be numeric.</p>';
				errors += error;
				markInvalid(input, form);
			}

			if (input.hasClass('confirm') && password_input_exists(form) && jQuery('input[type=password]', form)[0].value != input.val() ) {
				error = '<p>Passwords do not match.</p>';
				errors += error;
				markInvalid(input, form);
			}
		}
		
		if (error != '' && !form.hasClass('silent')) {
			jQuery('.error', input.parent()).remove();
			input.before('<div class=\'flash error hidden\' style=\'width:'+ input.width() +'px;float:'+ input.css('float') +'\'>' + error + '</div>');
			jQuery('.error', input.parent()).slideDown();
		}

	});

	errors != '' ? form.data('valid', false) : form.data('valid', true);
	
	return form;
}