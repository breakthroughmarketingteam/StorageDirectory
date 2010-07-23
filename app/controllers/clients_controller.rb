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
    phone = params[:client].delete(:phone)
    @client = Client.new params[:client]
    @client.name = @client.first_name + ' ' + @client.last_name
    @client.role = Role.find_by_title 'advertiser'
    @mailing_address = @client.mailing_addresses.build :name => @client.name, :phone => phone, :company => @client.company
    @billing_info = @client.billing_infos.build :name => @client.name, :phone => phone
    @user_session = UserSession.new :password => @client.password, :email => @client.email
    
    if @client.save && @user_session.save
      flash[:notice] = @flash_msgs[:new_client]
      redirect_to client_account_path
    else
      raise model_errors(@client, @user_session).pretty_inspect
      flash[:error] = model_errors(@client, @user_session)
      redirect_to :action => 'new'
    end
  end
    
  def edit
    @client = params[:id].blank? ? current_user : Client.find(params[:id])
    redirect_to new_client_path
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
