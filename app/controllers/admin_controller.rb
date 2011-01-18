class AdminController < ApplicationController
  
  before_filter :require_user
  before_filter :ensure_secure_subdomain
  ssl_required :index
  
  @@unwanted_resources = /(admin)|(^sizes)|(maps)|(staff_emails)|(^specials)|(predef_special)|(links)|(suggestions)|(virtual_models)|(password_resets)|(us_states)|(widgets)|(business_hours)/i
  
  def index
    if current_user
      get_list_of_controllers_for_menu
      @controllers.reject! { |c| c =~ @@unwanted_resources }
      @controllers.sort!
    else
      @controllers = []
    end
    
    respond_to do |format|
      format.html {}
      format.js do
        render :layout => false
      end
    end
  end

end
