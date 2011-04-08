# Settings specified here will take precedence over those in config/environment.rb

# The production environment is meant for finished, "live" apps.
# Code is not reloaded between requests
config.cache_classes = true

# Full error reports are disabled and caching is turned on
config.action_controller.consider_all_requests_local = false
config.action_controller.perform_caching             = true
config.action_view.cache_template_loading            = true

# See everything in the log (default is :info)
# config.log_level = :debug

# Use a different logger for distributed setups
# config.logger = SyslogLogger.new

# Use a different cache store in production
# config.cache_store = :mem_cache_store

# Enable serving of images, stylesheets, and javascripts from an asset server
# config.action_controller.asset_host = "http://assets.example.com"

# Disable delivery errors, bad email addresses will be ignored
# config.action_mailer.raise_delivery_errors = false

# Enable threaded mode
# config.threadsafe!

# key for storagelocator.heroku.com
#GOOGLE_APPLICATION_ID = 'ABQIAAAALpG_-PAeF4LXKTM6JqFu2BRr_2tWjaRtZSAUCEDqSPiw8R7KmxSDLwHhFSM8wxLOt_2aL5uhHL0hyw'
# key for usselfstoragelocator.com
GOOGLE_APPLICATION_ID = 'ABQIAAAA0eayw5kiKoZsDZKkyQotDRTE80FJOyH0zSjklzaO53DwmhIGKBQ_SC_BImrLcTxxMsKRuFmrrwF3RQ'

# for heroku
#config.cache_store = :mem_cache_store, Memcached::Rails.new

# Object cache
require 'active_support/cache/dalli_store23'
config.cache_store = :dalli_store, ENV['MEMCACHE_SERVERS']
