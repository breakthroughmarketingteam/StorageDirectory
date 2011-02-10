module SearchesHelper
  
  def is_self_storage_search?
    type = @search && @search.storage_type ? @search.storage_type : params[:storage_type]
    return false if type.blank?
    type.gsub('-', ' ') =~ /(self)|(mobile)|(cold)/i
  end
  
  def search_back_path(search)
    search.nil? ? :back : "/self-storage/search/#{search.id}/#{search.state}/#{search.city}#{'/'+ search.zip.to_s if search.is_zip?}"
  end
  
  def get_search
    @search ||= Search.find_by_id(cookies[:sid]) || Search.create_from_geoloc(request, session[:geo_location], params[:storage_type])
  end
  
  def sort_status(search, sort)
    search.sorted_by == sort ? search.sort_reverse : '-'
  end
  
end
