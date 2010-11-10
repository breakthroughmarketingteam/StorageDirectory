module SearchesHelper
  
  def default_search_query
    @prev_search.try(:full_location_if_zip) || (session[:geo_location] && session[:geo_location].city)
  end
  
  def search_back_path(search)
    search.nil? ? :back : "/self-storage/search/#{search.id}/#{search.state}/#{search.city}#{'/'+ search.zip.to_s if search.is_zip?}"
  end
  
end
