class ClientsController < ApplicationController
  
  before_filter :get_models_paginated, :only => :index
  before_filter :get_model, :only => [:show, :update, :destroy]
  
  def index
  end

  def show
  end

  def new
    @client = Client.new
  end
  
  def create
    @client                       = Client.new params[:client]
    @mailing_address              = @client.mailing_addresses.build params[:mailing_address]
    @listing                      = @client.listings.build :title => @client.company, :status => 'unverified'
    @temp_password                = Client.rand_password
    @client.password              = @temp_password
    @client.password_confirmation = @temp_password
    @client.activation_code       = @client.make_activation_code
    @client.status                = 'unverified'
    @client.role_id               = Role.get_advertiser_role_id
    
    @listing.build_map :address => @mailing_address.address, :city => @mailing_address.city, :state => @mailing_address.state, :zip => @mailing_address.zip ,:phone => @mailing_address.phone
    
    if @client.save
      (params[:listings] || []).each do |id|
        Listing.find(id.to_i).update_attributes :user_id => @client.id, :status => 'unverified'
      end
      
      Notifier.deliver_client_notification @client, @temp_password
      
      render :json => { :success => true, :data => "Great job, you're almost ready! We sent you an email with an activation link. You'll be able to play around with your account after you click on that link. See you soon!" }
    else
      render :json => { :success => false, :data => model_errors(@client) }
    end
  end
    
  def edit
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

end
