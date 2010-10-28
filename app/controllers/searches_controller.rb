class SearchesController < ApplicationController
  
  skip_before_filter :init, :get_content_vars, :clean_home_url, :set_default_view_type, :load_app_config
  before_filter :get_models_paginated, :only => :index
  
  def index
    render :layout => false if request.xhr?
  end
  
  def show
    if params[:search_id]
      flash[:search_id] = params[:search_id]
      flash[:search_back] = true
      redirect_to :controller => 'listings', :action => 'locator', :state => params[:state], :city => params[:city], :zip => params[:zip]
    end
  end
  
  def create
    if params[:city]
      @search = Search.build_from_path params[:city], params[:state], params[:zip], request
    else
      @search = Search.build_from_params params[:search].merge(:remote_ip => request.remote_ip, :referrer => request.referrer), session[:geo_location]
    end
    
    respond_to do |format|
      format.html do
        if @search.save
          if session[:search_id]
            @prev_search = Search.find session[:search_id]
            @prev_search.add_child @search
          end
          
          flash[:search_id] = session[:search_id] = @search.id
          
          redirect_to :controller => 'listings', :action => 'locator', :state => @search.state, :city => @search.city, :zip => (@search.is_zip? && @search.zip)
        else
          flash[:error] = model_errors @search
          redirect_back_or_default root_path
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
