# Settings specified here will take precedence over those in config/environment.rb

# In the development environment your application's code is reloaded on
# every request.  This slows down response time but is perfect for development
# since you don't have to restart the webserver when you make code changes.
config.cache_classes = false

# Log error messages when you accidentally call methods on nil.
config.whiny_nils = true

# Show full error reports and disable caching
config.action_controller.consider_all_requests_local = true
config.action_view.debug_rjs                         = true
config.action_controller.perform_caching             = false

# Don't send emails in development mode
config.action_mailer.delivery_method = :test

# Don't care if the mailer can't send
config.action_mailer.raise_delivery_errors = false

# added by DS
config.gem 'hirb'
GOOGLE_APPLICATION_ID = 'ABQIAAAALpG_-PAeF4LXKTM6JqFu2BT2yXp_ZAY8_ufC3CFXhHIE1NvwkxQ1oK1Ytp6gJYBvrXawCQUTyWBHJw'
