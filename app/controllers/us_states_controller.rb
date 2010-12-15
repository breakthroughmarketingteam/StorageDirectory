class UsStatesController < ApplicationController

  def show
    @cities = UsCity.cities_of params[:state]
  end

end
