class PredefinedSpecialsController < ApplicationController
  
  ssl_required :index, :show, :new, :create, :edit, :update, :destroy, :toggle
  before_filter :get_models_paginated, :only => :index
  before_filter :get_model, :only => [:show, :new, :edit, :update, :destroy, :toggle]
  before_filter :get_parent_models, :only => :toggle
  
  def index
    render :layout => false if request.xhr?
  end

  def new
    render :layout => false if request.xhr?
  end

  def create
    @predefined_special = PredefinedSpecial.new params[:predefined_special]
    
    respond_to do |format|
      format.html do
        if @predefined_special.save
          flash[:notice] = 'Special has been created.'
      
          case params[:for]
          when nil
            redirect_to predefined_specials_path
          when 'tip'
            redirect_to :back
          end
        else
          render :action => 'edit'
        end    
      end
      
      format.js do 
        if @predefined_special.save          
          if params[:for] == 'tip'
            render :json => { :success => true, :data => "Thanks for sharing your tip! We'll put it up as soon as we can." }
          else
            flash.now[:notice] = @predefined_special.title + ' has been created.'
            get_models_paginated
            render :action => 'index', :layout => false
          end
        else
          flash.now[:error] = model_errors(@predefined_special)
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
        if @predefined_special.update_attributes(params[:predefined_special])
          flash[:notice] = @predefined_special.title + ' has been updated.'
          redirect_to :action => 'show'
        else
          render :action => 'edit'
        end
      end
      
      format.js do
        if @predefined_special.update_attributes(params[:predefined_special])
          flash.now[:notice] = @predefined_special.title + ' has been updated.'
          get_models_paginated
          render :action => 'index', :layout => false
        else
          flash.now[:error] = model_errors(@predefined_special)
          render :action => 'edit', :layout => false
        end
      end
    end
  end

  def destroy
    if @predefined_special.destroy
      flash[:notice] = @predefined_special.title + ' DESTROYED!'
      redirect_to predefined_specials_path
    else
      flash[:error] = 'Error destroying ' + @predefined_special.title
      render :action => 'edit'
    end
  end
  
  def toggle
    @predefined_special = PredefinedSpecial.find params[:id]
    
    if @listing.predefined_specials.include? @predefined_special
      @listing.predefined_specials -= [@predefined_special]
    else
      @listing.predefined_specials << @predefined_special
    end
    
    render :json => { :success => @listing.save }
  rescue => e
    render :json => { :success => false, :data => e.message }
  end
  
  private
  
  def get_parent_models
    @client = (current_user && current_user.has_role?('admin', 'staff')) ? Client.find(params[:client_id]) : current_user
    @listing = @client.listings.find params[:listing_id]
  end
  
end