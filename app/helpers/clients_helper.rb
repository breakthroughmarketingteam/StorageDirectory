module ClientsHelper
  
  def new_client_message
    if flash[:new_client_created]
      html = '<div id="new_client_message" class="flash notice">'
      html << "<p>#{flash[:new_client_created]}</p>"
      html << '</div>'
    end
  end
  
end