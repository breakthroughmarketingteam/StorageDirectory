module RentalsHelper
  
  # build a path to a metal controller to handle the secure rental form
  def rack_rental_url(listing, size = nil, special = nil, show_size_ops = true)
    "https://#{request.host}/rentalizer?listing_id=#{listing.id}&size_id=#{size.try :id}&show_size_ops=#{show_size_ops}&special_id=#{special.try :id}"
  end
  
end
