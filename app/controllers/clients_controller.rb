class ClientsController < ApplicationController
  
  before_filter :get_models_paginated, :only => :index
  before_filter :get_model, :only => [:show, :update, :destroy, :test_issn]
  
  def index
    render :layout => false if request.xhr?
  end

  def show
    render :layout => false if request.xhr?
  end

  def new
    @page = Page.find_by_title_in_params params[:title]
    @client = Client.new
    render :layout => false if request.xhr?
  end
  
  def create
    @client = Client.new params[:client]
    @mailing_address = @client.mailing_addresses.build params[:mailing_address].merge(:name => @client.name, :company => @client.company, :email => @client.email)
    
    @client.user_hints = UserHint.all
    
    unless params[:listings].blank?
      @client.listing_ids = params[:listings]
      @client.enable_listings!
    else
      @listing = @client.listings.build :title => @client.company, :status => 'unverified', :enabled => true
      @listing.build_map :address => @mailing_address.address, :city => @mailing_address.city, :state => @mailing_address.state, :zip => @mailing_address.zip ,:phone => @mailing_address.phone
    end
    
    if @client.save_without_session_maintenance
      Notifier.deliver_client_notification @client
      Notifier.deliver_new_client_alert @client
      
      flash[:new_client_created] = "We've sent you an email to #{@client.email} with your new account details. You'll be able to login by following the link in your email to activate your account."
      render :json => { :success => true }
    else
      render :json => { :success => false, :data => model_errors(@client) }
    end
  end
    
  def edit
    redirect_to client_account_path if current_user.has_role?('advertiser') && params[:id]
   
    @client = params[:id].blank? ? current_user : Client.find(params[:id])
    @listings = @client.listings.paginate(:conditions => 'enabled IS TRUE', :per_page => 5, :page => params[:page], :order => 'id DESC', :include => :map)
    
    @settings = @client.settings || @client.build_settings
    @listing_description = @client.listing_description || @client.build_listing_description
    
    redirect_to new_client_path if @client.nil?
  end
  
  def update
    respond_to do |format|
      if @client.update_info params[:client]
        # upsets is a hidden field set to true in the settings partial
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
          flash[:error] = model_errors(@client)
          redirect_to :action => 'edit'
        end
        
        format.js do
          render :json => { :success => false, :data => model_errors(@client) }
        end
      end
    end
  end
  
  def activate
    @client = Client.find_by_activation_code params[:code]
    
    case @client.status when 'unverified'
      @client.update_attribute :status, 'active'
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
  
  def test_issn
    if @client.issn_test params[:facility_id], (params[:enable_test] == 'true' ? true : false)
      response = 'Data Sync Complete'
    else
      response = 'ISSN Test Disabled'
    end
    
    render :json => { :success => true, :data => response }
  rescue => e
    render :json => { :success => false, :data => e.message }
  end

end
