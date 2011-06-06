#!/usr/bin/env ruby -wKU
require 'optparse'
# This hash will hold all of the options
# parsed from the command-line by
# OptionParser.
options = {}

optparse = OptionParser.new do|opts|
  # Set a banner, displayed at the top
  # of the help screen.
  opts.banner = "Usage: up.rb -m 'commit message' ..."

  # Define the options, and what they do
  options[:message] = false
  opts.on( '-m', '--message', 'Set git commit message' ) do
    options[:message] = true
  end

  # This displays the help screen, all programs are
  # assumed to have this option.
  opts.on( '-h', '--help', 'Display this screen' ) do
    puts opts
    exit
  end
end

# Parse the command-line. Remember there are two forms
# of the parse method. The 'parse' method simply parses
# ARGV, while the 'parse!' method parses ARGV and removes
# any options found there, as well as any parameters for
# the options. What's left is the list of files to resize.
optparse.parse!

`git add .`

`git commit -m '#{options[:message]}'`

`git push heroku master`

puts "Done pushing."
