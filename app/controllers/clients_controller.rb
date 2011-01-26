class ClientsController < ApplicationController
  
  ssl_required :index, :show, :edit, :edit_info, :update, :verify, :activate
  skip_before_filter :simple_auth, :only => :activate
  before_filter :get_models_paginated, :only => :index
  before_filter :get_model, :only => [:show, :update, :destroy, :verify]
  before_filter :get_client, :only => [:edit, :edit_info]
  
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
    @client = Client.new params
    
    if @client.save_without_session_maintenance
      Notifier.delay.deliver_client_notification @client
      Notifier.delay.deliver_new_client_alert @client
      
      render :json => { :success => true, :data => { :activation_code => @client.activation_code } }
    else
      render :json => { :success => false, :data => model_errors(@client) }
    end
  end
    
  def edit
    redirect_to client_account_path if current_user.has_role?('advertiser') && params[:id]
    
    if @client.nil?
      redirect_to new_client_path
    else
      @listings = @client.listings.paginate(:conditions => 'enabled IS TRUE', :per_page => 10, :page => params[:page], :order => 'id DESC', :include => :map)
      @settings = @client.settings || @client.build_settings
      @client_welcome = Post.tagged_with('client welcome').last.content if !is_admin? && @client.login_count == 1
      
      render :layout => false if request.xhr?
    end
  end
  
  def edit_info
    @billing_info = @client.billing_info || @client.build_billing_info
    @mailing_address = @client.mailing_address || @client.build_mailing_address
    
    render :json => { :success => true, :data => render_to_string(:layout => false) }
  rescue => e
    render :json => { :success => false, :data => e.message }
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
    
    if @client.nil?
      flash[:error] = "We couldn't find that account, make sure you used the correct link or that you copied it completely."
      redirect_to login_path
    else
      case @client.status when 'unverified'
        @client.update_attribute :status, 'active'
        flash[:quick_login] = [@client.email, @client.temp_password]
        flash[:notice] = 'Congratulations! Your account is ready. Go ahead and log in.'
        redirect_to login_path
      
      when 'active'
        flash[:notice] = 'Your account is already active. Go ahead and log in.'
        flash[:quick_login] = [@client.email, @client.temp_password]
        redirect_to login_path
      
      when 'suspended'
        flash[:error] = 'Your account is suspended.'
        redirect_to root_path
      end
    end
  end
  
  def resend_activation
    @client = Client.find_by_activation_code params[:code]
    Notifier.delay.deliver_client_notification @client
    
    render :json => { :success => true }
  rescue => e
    render :json => { :success => false, :data => e.message }
  end
  
  def verify
    @client.enable_listings!
    @partial = 'activation_email'
    Blaster.delay.deliver_html_email @client.email, 'Your account is ready at USSelfStorageLocator.com', render_to_string(:layout => 'email_template')
    
    respond_to do |format|
      format.html { redirect_back_or_default '/admin' }
      format.js { render :json => { :success => true } }
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
  
  private
  
  def get_client
    @client = is_admin? ? Client.find_by_id(params[:id]) : current_user
  end

end