#!/usr/bin/env ruby -wKU

puts "Running: git add ."
`git add .`

puts "Running: git commit -m 'merge'"
`git commit -m 'merge'`

puts "Done pushing."
