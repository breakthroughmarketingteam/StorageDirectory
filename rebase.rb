#!/usr/bin/env ruby -wKU

puts "Running: git checkout master"
`git checkout master`

puts "Running: git rebase luis"
`git rebase luis`

puts "Running: git branch -d luis"
`git branch -d luis`

puts "Done rebasing."