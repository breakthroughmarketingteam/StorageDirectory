class SearchesController < ApplicationController
  
  before_filter :get_models_paginated, :only => :index
  
  def index
    render :layout => false if request.xhr?
  end
  
  def show
    
  end
  
end
