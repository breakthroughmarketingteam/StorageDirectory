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
    @client = Client.new
    render :layout => false if request.xhr?
  end
  
  def create
    @client = Client.new params[:client]
    @mailing_address = @client.mailing_addresses.build params[:mailing_address]
    
    @client.user_hints = UserHint.all
    @client.report_recipients = @client.email
    
    unless params[:listings].blank?
      @client.listing_ids = params[:listings]
    else
      @listing = @client.listings.build :title => @client.company, :status => 'unverified'
      @listing.build_map :address => @mailing_address.address, :city => @mailing_address.city, :state => @mailing_address.state, :zip => @mailing_address.zip ,:phone => @mailing_address.phone
    end
    
    if @client.save_without_session_maintenance
      Notifier.deliver_client_notification @client
      
      msg = "<p class='stack'>Great job, you're almost ready! We sent you an email with an activation link. \
              You'll be able to play around with your account after you click on that link. \
              See you soon!</p> \
              <p class='stack'><strong>Click below to sign in:</strong</p> \
              <p>Email: #{@client.email}</p> \
              <p class='stack'>Password: #{@client.temp_password}</p>
              <p><a href='/clients/activate/#{@client.activation_code}'>Activate Test</a></p>"
      render :json => { :success => true, :data => msg }
    else
      render :json => { :success => false, :data => model_errors(@client) }
    end
  end
    
  def edit
    redirect_to client_account_path if current_user.has_role?('advertiser') && params[:id]
   
    @client = params[:id].blank? ? current_user : Client.find(params[:id])
    @listings = @client.listings.paginate(:per_page => 5, :page => params[:page], :order => 'id DESC', :include => :map)
    
    redirect_to new_client_path if @client.nil?
  end
  
  def update
    respond_to do |format|
      if @client.update_info(params[:client])
        format.html do
          flash[:notice] = 'Info updated successfully'
          redirect_to :action => 'edit'
        end
        
        format.js do
          render :json => { :success => true }
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
      flash[:notice] = "Congratulations! Your account is now active. Go ahead and log in."
      redirect_to login_path
      
    when 'active'
      flash[:notice] = "Your account is already active. Go ahead and log in."
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
