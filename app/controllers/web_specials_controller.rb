class WebSpecialsController < ApplicationController

  before_filter :get_listing
  
  def create
    @web_special = @listing.web_specials.build params[:web_special]
    
    if @web_special.save
      render :json => { :success => true }
    else
      render :json => { :success => false, :data => model_errors(@web_special) }
    end
  end

  def update
  end

end
