class SearchesController < ApplicationController
  
  before_filter :get_models_paginated, :only => :index
  
  def index
    render :layout => false if request.xhr?
  end
  
  def create
    @search = Search.build_from_params params[:search], request, session[:geo_location]
    
    respond_to do |format|
      format.html do
        if @search.save
          session[:search_id] = @search.id
          redirect_to :controller => 'listings', :action => 'locator', :state => @search.state, :city => @search.city
        else
          flash[:error] = model_errors @search
          redirect_back_or_default root_path(params)
        end
      end
      
      format.js do
        if @search.save
          session[:search_id] = @search.id
        else
          
        end
      end
    end
  end
  
end
