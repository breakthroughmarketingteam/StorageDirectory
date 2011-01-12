class UserStatsController < ApplicationController
  
  ssl_required :index
  ssl_allowed :index
  before_filter :get_models_paginated, :only => :index
  
  def index
    render :layout => false if request.xhr?
  end

  def create
    
  end

end
