class FacilityFeaturesController < ApplicationController
  
  ssl_required :index, :new, :create, :edit, :update, :toggle, :destroy
  before_filter :get_parent_models, :only => :toggle
  before_filter :get_model, :only => [:new, :edit, :update, :destroy]
  
  def index
    get_models_paginated
    render :layout => false if request.xhr?
  end
  
  def new
    render :layout => false if request.xhr?
  end
  
  def create
    @facility_feature = FacilityFeature.new params[:facility_feature]
    
    respond_to do |format|
      format.html do
        if @facility_feature.save
          flash[:notice] = "#{@facility_feature.title} has been created."
          redirect_back_or_default facility_features_path
        else
          flash[:error] = model_errors @facility_feature
          render :action => 'edit'
        end
      end
      
      format.js do
        if @facility_feature.save
          flash.now[:notice] = "#{@facility_feature.title} has been created."
          get_models_paginated
          render :action => 'index', :layout => false
        else
          flash.now[:error] = model_errors @facility_feature
          render :action => 'edit', :layout => false
        end
      end
    end
  end
  
  def edit
    render :layout => false if request.xhr?
  end
  
  def update
    respond_to do |format|
      format.html do 
        if @facility_feature.update_attributes params[:facility_feature]
          flash[:notice] = @facility_feature.title + ' has been updated.'
          redirect_back_or_default facility_features_path
        else
          flash[:error] = model_errors @facility_feature
          render :action => 'edit'
        end
      end
      
      format.js do
        if @facility_feature.destroy
          flash.now[:notice] = @facility_feature.title + ' has been updated.'
          get_models_paginated
          render :action => 'index', :layout => false
        else
          flash.now[:error] = model_errors @facility_feature
          render :action => 'edit', :layout => false
        end
      end
    end
  end
  
  def destroy
    respond_to do |format|
      format.html do 
        if @facility_feature.destroy
          flash[:notice] = @facility_feature.title + ' DESTROYED!'
          redirect_back_or_default facility_features_path
        else
          flash[:error] = 'Error destroying ' + @facility_feature.title
          render :action => 'edit'
        end
      end
      
      format.js do
        if @facility_feature.destroy
          flash.now[:notice] = @facility_feature.title + ' DESTROYED!'
          get_models_paginated
          render :action => 'index', :layout => false
        else
          flash.now[:error] = 'Error destroying ' + @facility_feature.title
          render :action => 'edit', :layout => false
        end
      end
    end
  end
  
  def toggle
    @facility_feature = FacilityFeature.find params[:id]
    
    if @listing.facility_features.include? @facility_feature
      @listing.facility_features -= [@facility_feature]
    else
      @listing.facility_features << @facility_feature
    end
    
    render :json => { :success => @listing.save }
  rescue => e
    render :json => { :success => false, :data => e.message }
  end
  
  private
  
  def get_parent_models
    @client = is_admin? ? Client.find(params[:client_id]) : current_user
    @listing = @client.listings.find params[:listing_id]
  end
  
end