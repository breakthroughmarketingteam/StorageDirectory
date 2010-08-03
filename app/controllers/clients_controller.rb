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
    render :json => { :success => true, :data => "Thanks for signing up #{params[:contact_info][:first_name]}! This is the part where you would receive an email at #{params[:contact_info][:email]} to confirm your account." }
=begin    
    if @client.save && @user_session.save
      flash[:notice] = @flash_msgs[:new_client]
      redirect_to client_account_path
    else
      raise model_errors(@client, @user_session).pretty_inspect
      flash[:error] = model_errors(@client, @user_session)
      redirect_to :action => 'new'
    end
=end
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
