desc "This task is called by the Heroku cron add-on"
task :cron => :environment do
  if Time.now.hour % 4 == 0 # run every four hours
    puts "run every four hours"
  end

  if Time.now.hour == 0 # run at midnight
     puts "run every at midnight"
  end
end