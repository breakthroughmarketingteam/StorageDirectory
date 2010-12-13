class TenantsController < ApplicationController
  
  before_filter :get_models_paginated, :only => :index
  before_filter :get_model, :only => [:show, :update, :destroy, :toggle_specials]
  
  def index
    render :layout => false if request.xhr?
  end

  def show
    render :layout => false if request.xhr?
  end

  def new
    @tenant = Tenant.new
    render :layout => false if request.xhr?
  end
  
  def create
    @tenant = Tenant.new params[:tenant]
    raise [@tenant, params].pretty_inspect
    
    if @tenant.save_without_session_maintenance
      Notifier.deliver_tenant_notification @tenant
      Notifier.deliver_new_tenant_alert @tenant
      
      render :json => { :success => true }
    else
      render :json => { :success => false, :data => model_errors(@tenant) }
    end
  end
    
  def edit
    redirect_to tenant_account_path if current_user.has_role?('advertiser') && params[:id]
   
    @tenant = params[:id].blank? ? current_user : Tenant.find(params[:id])
    @listings = @tenant.listings.paginate(:conditions => 'enabled IS TRUE', :per_page => 5, :page => params[:page], :order => 'id DESC', :include => :map)

    @settings = @tenant.settings || @tenant.build_settings    
    @tenant_welcome = Post.tagged_with('tenant welcome').last.try :content
    
    redirect_to new_tenant_path if @tenant.nil?
  end
  
  def update
    respond_to do |format|
      if @tenant.update_info params[:tenant]
        # :upsets is a hidden field set to true in the settings partial
        partial = params[:upsets] ? 'settings' : 'owner_info'
        
        format.html do
          flash[:notice] = "#{partial.titleize} updated successfully"
          redirect_to :action => 'edit'
        end
        
        format.js do
          render :json => { :success => true, :data => render_to_string(:partial => partial) }
        end
        
      else
        format.html do
          flash[:error] = model_errors(@tenant)
          redirect_to :action => 'edit'
        end
        
        format.js do
          render :json => { :success => false, :data => model_errors(@tenant) }
        end
      end
    end
  end
  
  def activate
    @tenant = Tenant.find_by_activation_code params[:code]
    
    case @tenant.status when 'unverified'
      @tenant.update_attribute :status, 'active'
      flash[:notice] = 'Congratulations! Your account is now active. Go ahead and log in.'
      redirect_to login_path
      
    when 'active'
      flash[:notice] = 'Your account is already active. Go ahead and log in.'
      redirect_to login_path
      
    when 'suspended'
      flash[:error] = 'Your account is suspended'
      redirect_to root_path
    end
  end
  
  def resend_activation
    @tenant = Tenant.find_by_activation_code params[:code]
    Notifier.deliver_tenant_notification @tenant
    
    render :json => { :success => true }
  rescue => e
    render :json => { :success => false, :data => e.message }
  end
  
  def toggle_specials
    if params[:toggle] == 'true'
      @tenant.predef_special_assigns.create :predefined_special_id => params[:predefined_special_id]
    else
      @tenant.predef_special_assigns.find_by_predefined_special_id(params[:predefined_special_id]).destroy
    end
    
    render :json => { :success => true }
  end
  
  def test_issn
    if @tenant.issn_test params[:facility_id], (params[:enable_test] == 'true' ? true : false)
      response = 'Data Sync Complete'
    else
      response = 'ISSN Test Disabled'
    end
    
    render :json => { :success => true, :data => response }
  rescue => e
    render :json => { :success => false, :data => e.message }
  end

end
