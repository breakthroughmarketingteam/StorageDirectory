class ClientsController < ApplicationController
  
  before_filter :get_models_paginated, :only => :index
  before_filter :get_model, :only => [:show, :edit, :update, :destroy]
  
  def index
  end

  def show
  end

  def new
    @client = Client.new
  end
  
  def create
    raise params.pretty_inspect
  end
    
  def edit
    @client = params[:id].blank? ? current_user : Client.find(params[:id])
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
