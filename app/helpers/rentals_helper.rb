module RentalsHelper
  
  # build a path to a metal controller to handle the secure rental form
  def rack_rental_url(listing, size, special, show_size_ops)
    "https://#{request.host}/rentalizer?listing_id=#{listing.id}&size_id=#{size.try :id}&show_size_ops=#{show_size_ops}#{"&special_id=#{special.id}" if special}"
  end
  
end
