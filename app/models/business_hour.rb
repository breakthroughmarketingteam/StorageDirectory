class BusinessHour < ActiveRecord::Base
  
  belongs_to :listing
  
  def self.days
    %w(Mon Tue Wed Thu Fri Sat Sun)
  end
  
  def self.times
    %w(am pm).map do |meridian|
      times = %w(00 30).map do |minutes|
        [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map { |hour| "#{hour}:#{minutes} #{meridian}"  }
      end
      times[0].zip times[1]
    end.flatten
  end
  
end
