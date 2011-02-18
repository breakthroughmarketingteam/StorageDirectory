class TenantsController < ApplicationController
  
  ssl_required :index, :show, :new, :create, :edit, :update, :destroy, :activation
  before_filter :get_models_paginated, :only => :index
  before_filter :get_tenant, :only => [:show, :new, :edit, :update, :destroy]
  
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
    @tenant = Tenant.find_by_email(params[:tenant][:email]) || Tenant.new(params[:tenant])
    @tenant.merge_attr_if_diff! params[:tenant] unless @tenant.new_record?
    
    @rental = @tenant.rentals.build params[:rental]
    @rental.apply_savings! params
    
    if @tenant.save_without_session_maintenance
      @rental.update_attribute :conf_num, "#{@tenant.id}-#{@rental.id}"
      Notifier.deliver_tenant_notification @tenant, @rental
      Notifier.deliver_new_tenant_alert @tenant, @rental
      
      conf_data = { 
        :r_name         => @tenant.name,
        :r_email        => @tenant.email,
        :r_conf_num     => @rental.conf_num,  
        :r_unit         => @rental.size.full_title, 
        :r_move_in_date => @rental.nice_move_in_date, 
        :r_paid_thru    => @rental.nice_paid_thru, 
        :r_savings      => "$#{sprintf("%.2f", @rental.savings)}", 
        :r_total        => "$#{sprintf("%.2f", @rental.total)}" 
      }
      conf_data.merge! :r_special => @rental.special.title if @rental.special
      
      render :json => { :success => true, :data => conf_data }
    else
      render :json => { :success => false, :data => model_errors(@tenant).uniq }
    end
  end
    
  def edit
    render :layout => false if request.xhr?
  end
  
  def update
    respond_to do |format|
      format.html do
        if @tenant.update_attributes(params)
          flash[:notice] = "#{@tenant.name.possessive} account has been updated!"
          redirect_back_or_default tenant_path(@tenant)
        else
          render :action => :edit
        end
      end
      
      format.js do
        if @tenant.update_attributes(params)
          flash.now[:notice] = "#{@tenant.name.possessive} account has been updated!"
          render :action => 'edit', :layout => false
        else
          flash.now[:error] = model_errors @tenant
          render :action => 'edit', :layout => false
        end
      end
    end
  end
  
  def activate
    @tenant = Tenant.find_by_activation_code params[:code]
    
    case @tenant.status when 'unverified'
      @tenant.update_attribute :status, 'active'
      flash[:quick_login] = [@tenant.email, @tenant.temp_password]
      flash[:notice] = 'Congratulations! Your account is now active. Go ahead and log in.'
      redirect_to login_path
      
    when 'active'
      flash[:quick_login] = [@tenant.email, @tenant.temp_password]
      flash[:notice] = 'Your account has already been activated. Go ahead and log in.'
      redirect_to login_path
      
    when 'suspended'
      flash[:error] = 'Sorry, your account is suspended. Contact us if you think you\'re receiving this message in error.'
      redirect_to root_path
    end
  end
  
  def resend_activation
    @tenant = Tenant.find_by_activation_code params[:code]
    Notifier.deliver_tenant_notification @tenant, @tenant.rentals.last
    
    render :json => { :success => true }
  rescue => e
    render :json => { :success => false, :data => e.message }
  end
  
  private
  
  def get_tenant
    @tenant = current_user && current_user.has_role?('admin', 'staff') ? Tenant.find(params[:id]) : current_user
  end
  
end