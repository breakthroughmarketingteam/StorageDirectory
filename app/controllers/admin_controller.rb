class AdminController < ApplicationController
  
  def index
    @controllers.reject! { |c| c =~ /(admin)|(^sizes)|(maps)|(^specials)|(predef_special)|(facility_features)|(links)|(suggestions)|(virtual_models)|(password_resets)|(us_states)|(widgets)|(business_hours)/i }
    
    respond_to do |format|
      format.html {}
      format.js do
        render :layout => false
      end
    end
  end

end
