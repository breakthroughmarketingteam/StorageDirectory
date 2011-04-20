class AdPartnersController < ApplicationController

  ssl_required :index, :show, :new, :create, :edit, :update, :destroy
  before_filter :get_model, :only => [:show, :new, :edit, :update, :destroy]
  
  def index
    get_ad_partners
    render :layout => false if request.xhr?
  end

  def show
    render :layout => false if request.xhr?
  end

  def new
    @ad_partner = AdPartner.new
    render :layout => false if request.xhr?
  end

  def create
    @ad_partner = AdPartner.new params[:ad_partner]
    
    respond_to do |format|
      format.html do
        if @ad_partner.save
          flash[:notice] = @ad_partner.title + ' has been created.'
          redirect_back_or_default ad_partners_path
        else
          render :action => 'edit'
        end
      end
      
      format.js do
        if @ad_partner.save
          flash.now[:notice] = @ad_partner.title + ' has been created.'
          get_ad_partners
          render :action => :index, :layout => false
        else
          flash.now[:error] = model_errors(@ad_partner)
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
        if @ad_partner.update_attributes(params[:ad_partner])
          flash[:notice] = @ad_partner.title + ' has been updated.'
          redirect_back_or_default ad_partners_path
        else
          render :action => 'edit'
        end
      end
      
      format.js do
        if @ad_partner.update_attributes(params[:ad_partner])
          flash.now[:notice] = @ad_partner.title + ' has been updated.'
          get_ad_partners
          render :action => 'index', :layout => false
        else
          flash.now[:error] = model_errors(@ad_partner)
          render :action => 'edit', :layout => false
        end
      end
    end
  end

  def destroy
    respond_to do |format|
      format.html do
        if @ad_partner.destroy
          flash[:notice] = @ad_partner.title + ' DESTROYED!'
        else
          flash[:error] = 'Error destroying ' + @ad_partner.title
        end
        
        redirect_back_or_default ad_partners_path
      end
      
      format.js do
        if @ad_partner.destroy
          flash.now[:notice] = @ad_partner.title + ' DESTROYED!'
          get_ad_partners
        else
          flash.now[:error] = 'Error destroying ' + @ad_partner.title
        end
        
        render :action => 'index', :layout => false
      end
    end
  end
  
  private
  
  def get_ad_partners
    @ad_partners = AdPartner.all(:order => 'position').paginate :per_page => @per_page, :page => params[:page]
  end
  
end
