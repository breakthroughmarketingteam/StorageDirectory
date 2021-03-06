# Be sure to restart your server when you modify this file

# Specifies gem version of Rails to use when vendor/rails is not present
RAILS_GEM_VERSION = '2.3.5' unless defined? RAILS_GEM_VERSION
STYLESHEET_INCLUDES = ['plugins/jquery.ui', 'plugins/jquery.jqplot', 'common', 'ajaxful_rating', 'themes/storagelocator/style']
JAVASCRIPT_INCLUDES = ['swfobject_modified', 'jquery.all', "plugins/inflector", "plugins/jquery.iframe", "plugins/jquery.jqDock.min", "plugins/jquery.inline-search", "plugins/jquery.tools.min", 'plugins/excanvas.min', 'plugins/jquery.jqplot.min', 'plugins/jqplot.dateAxisRenderer.min', 'plugins/jqplot.canvasTextRenderer.min', 'plugins/jqplot.canvasAxisTickRenderer.min', 'plugins/jqplot.highlighter.min', 'plugins/jqplot.cursor.min', "plugins/jquery.jmap.min", "plugins/jquery.preloadCssImages", "plugins/binfo", 'greymatter', "plugins/greyresults", 'application']

GTB_MERCHANT = { :id => '236977', :pin => 'Qh3Q3jxVtaZg' }
SERVER_IP = begin
  require 'socket'
  orig, Socket.do_not_reverse_lookup = Socket.do_not_reverse_lookup, true  # turn off reverse DNS resolution temporarily

  UDPSocket.open do |s|
    s.connect '64.233.187.99', 1
    s.addr.last
  end
ensure
  Socket.do_not_reverse_lookup = orig
end

USSSL_DOMAIN = 'usselfstoragelocator.com'
USSSL_PHONE = '1-888-222-0225'
USSSL_TRIAL_DAYS = 60

# Bootstrap the Rails environment, frameworks, and default configuration
require File.join(File.dirname(__FILE__), 'boot')
require 'aws/s3'
require 'issn_adapter'
if RAILS_ENV == 'development' # pretty_print
  require 'ap'
  require 'PP'
  Hirb.enable :pager => true, :formatter => true if defined? Hirb
end

Rails::Initializer.run do |config|
  # Settings in config/environments/* take precedence over those specified here.
  # Application configuration should go into files in config/initializers
  # -- all .rb files in that directory are automatically loaded.

  # Add additional load paths for your own custom dirs
  # config.load_paths += %W( #{RAILS_ROOT}/extras )

  # Specify gems that this application depends on and have them installed with rake gems:install
  # config.gem "bj"
  # config.gem "hpricot", :version => '0.6', :source => "http://code.whytheluckystiff.net"
  # config.gem "sqlite3-ruby", :lib => "sqlite3"
  # config.gem "aws-s3", :lib => "aws/s3"
  # config.gem 'liquid'
  # config.gem 'authlogic'
  # config.gem 'facebooker'
  config.gem 'aws-s3'
  config.gem 'geokit'
  config.gem 'will_paginate'
  config.gem 'httparty'
  config.gem 'dalli'
  config.gem 'ajaxful_rating'
  config.gem 'ssl_requirement'
  config.gem 'rmagick', :lib => 'RMagick'
  config.gem 'delayed_job', :version => '~>2.0.4'
  config.gem 'jammit', :source => 'git://github.com/documentcloud/jammit.git'
  config.gem 'url_shortener'
  config.gem 'nokogiri'
  #config.gem 'strongbox'
  config.gem 'rack-rewrite', '~> 1.0.2'
  require 'rack/rewrite'
  config.middleware.insert_before(Rack::Lock, Rack::Rewrite) do
    r301 /.*/,  Proc.new {|path, rack_env| "http://#{rack_env['SERVER_NAME'].gsub(/www\./i, '') }#{path}" },
        :if => Proc.new {|rack_env| rack_env['SERVER_NAME'] =~ /(www\.)|(secure\.)/i}
  end
  # TODO: does heroscale work? their site is down as of feb 2011
  #config.gem "heroscale"
  #require "heroscale"
  #config.middleware.use "Heroscale::Middleware"
  
  # Only load the plugins named here, in the order given (default is alphabetical).
  # :all can be used as a placeholder for all plugins not explicitly named
  # config.plugins = [ :exception_notification, :ssl_requirement, :all ]

  # Skip frameworks you're not going to use. To use Rails without a database,
  # you must remove the Active Record framework.
  # config.frameworks -= [ :active_record, :active_resource, :action_mailer ]

  # Activate observers that should always be running
  # config.active_record.observers = :cacher, :garbage_collector, :forum_observer

  # Set Time.zone default to the specified zone and make Active Record auto-convert to this zone.
  # Run "rake -D time" for a list of tasks for finding time zone names.
  config.time_zone = 'UTC'

  # The default locale is :en and all translations from config/locales/*.rb,yml are auto loaded.
  # config.i18n.load_path += Dir[Rails.root.join('my', 'locales', '*.{rb,yml}')]
  # config.i18n.default_locale = :de
  
end