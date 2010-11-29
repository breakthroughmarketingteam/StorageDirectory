module SearchesHelper
  
  def search_back_path(search)
    search.nil? ? :back : "/self-storage/search/#{search.id}/#{search.state}/#{search.city}#{'/'+ search.zip.to_s if search.is_zip?}"
  end
  
  def get_search
    @search ||= Search.find_by_id(session[:search_id])
  end
  
end
