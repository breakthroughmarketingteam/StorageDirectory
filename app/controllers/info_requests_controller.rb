class InfoRequestsController < ApplicationController
  
  ssl_required :index, :show, :new, :edit, :update, :destroy
  before_filter :get_models_paginated, :only => :index
  before_filter :get_model, :only => [:show, :edit, :update, :destroy]
  
  def index
    render :layout => false if request.xhr?
  end
  
  def show
    render :layout => false if request.xhr?
  end
  
  def edit
    render :layout => false if request.xhr?
  end
  
  def create
    @listing = Listing.find params[:info_request][:listing_id]
    @info_request = @listing.info_requests.build params[:info_request].merge(:status => 'pending').merge(params[:reserver]).merge(params[:mailing_address])
    
    if @listing.save
      @info_request.delay.deliver_emails
      render :json => { :success => true, :data => render_to_string(:partial => 'info_requests/done') }
    else
      render :json => { :success => false, :data => model_errors(@info_request) }
    end
  end
  
  def update
    respond_to do |format|
      format.html do
        if @info_request.update_attributes params[:info_request]
          flash[:notice] = 'Info request updated'
          redirect_back_or_default info_requests_path
        else
          flash[:error] = model_errors(@info_request)
          render :action => 'edit'
        end
      end
      
      format.js do
        if @info_request.update_attributes params[:info_request]
          flash.now[:notice] = 'Info request updated'
          get_models_paginated
          render :action => 'index', :layout => false
        else
          flash.now[:error] = model_errors(@info_request)
          render :action => 'edit', :layout => false
        end
      end
    end
  end
  
  def destroy
    respond_to do |format|
      format.html do
        if @info_request.destroy
          flash[:notice] = 'Info request has been DESTROYED!'
          redirect_back_or_default info_requests_path
        else
          flash[:error] = 'Error: could not destroy info request.'
          render :action => 'edit'
        end
      end
      
      format.js do
        if @info_request.destroy
          flash.now.now[:notice] = 'Info request has been DESTROYED!'
          get_models_paginated
          render :action => 'index', :layout => false
        else
          flash.now[:error] = 'Error: could not destroy info request.'
          render :action => 'edit', :layout => false
        end
      end
    end
  end

end
