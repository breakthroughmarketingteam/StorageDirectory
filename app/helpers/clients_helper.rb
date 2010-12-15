module ClientsHelper
  
  def new_client_message
    if flash[:new_client_created]
      html = '<div id="new_client_message" class="flash notice">'
      html << "<p>#{flash[:new_client_created]}</p>"
      html << '</div>'
    end
  end
  
  def disabled_and_predef_specials
    predef = PredefinedSpecial.all :conditions => ['id NOT IN (?)', @client.predef_special_assigns.map(&:predefined_special_id)]
    @client.disabled_specials | predef
  end
  
end