class AdminController < ApplicationController
  
  def index
    @controllers.reject! { |c| c =~ /(admin)|(sizes)|(maps)|(specials)|(facility_features)|(links)|(suggestions)|(virtual_models)|(password_resets)|(us_states)|(widgets)/i }
    
    respond_to do |format|
      format.html {}
      format.js do
        render :layout => false
      end
    end
  end

  def show
  end

  def new
  end

  def create
  end

  def edit
  end

  def update
  end

end
