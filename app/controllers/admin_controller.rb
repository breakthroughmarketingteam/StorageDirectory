class AdminController < ApplicationController
  
  def index
    @controllers.reject! { |c| c =~ /(admin)|(sizes)|(facility_features)|(links)|(suggestions)|(virtual_models)|(password_resets)|(us_states)/i }
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
