module SizesHelper
  
  def get_closest_unit_type(listing)
    listing.sizes.detect { |s| s.dims == params[:storage_size] } || listing.sizes.first
  end
  
end
