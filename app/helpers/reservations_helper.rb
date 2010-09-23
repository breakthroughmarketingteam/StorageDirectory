module ReservationsHelper
  
  def duration_of reservation
    distance_of_time_in_words reservation.move_in_date, reservation.move_out_date
  end
  
end
