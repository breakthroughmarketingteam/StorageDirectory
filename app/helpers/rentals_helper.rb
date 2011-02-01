module RentalsHelper
  
  # build a path to a metal controller to handle the secure rental form
  def rack_rental_url(listing, size, show_size_ops)
    "https://#{request.host}/rentalizer?listing_id=#{listing.id}&size_id=#{size.try :id}&show_size_ops=#{show_size_ops}"
  end
  
end
