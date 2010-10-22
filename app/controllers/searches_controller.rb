class SearchesController < ApplicationController
  
  before_filter :get_models_paginated, :only => :index
  
  def index
    render :layout => false if request.xhr?
  end
  
  def create
    @search = Search.build_new params[:search].merge(:remote_ip => request.remote_ip, :referrer => request.referrer), session[:geo_location]
    
    respond_to do |format|
      format.html do
        if @search.save
          if session[:search_id]
            @prev_search = Search.find_by_id session[:search_id]
            @prev_search.add_child @search
          end
          
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
