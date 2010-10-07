module BusinessHoursHelper
  
  def get_hour_by(day, type)
    @hours.detect { |h| h.day == day && h.hours_type == type }
  end
  
end
