class ReserversController < ApplicationController
  before_filter :get_models_paginated, :only => :index
  before_filter :get_model, :only => [:show, :edit, :update, :destroy]
  before_filter :get_roles, :only => [:index, :new, :edit, :create]
  before_filter :require_user, :except => [:new, :create]
  
  def index
    render :layout => false if request.xhr?
  end
  
  def show
    render :layout => false if request.xhr?
  end
  
  def new
    @reserver = Reserver.new
    render :layout => false if request.xhr?
  end
  
  def create
    @form = Form.find(params[:fid]) unless params[:fid].blank?
    @reserver = Reserver.new(params[:reserver])
    
    if @reserver.save
      #Notifier.deliver_subscriber_notification(@form.recipient, @reserver, request.host) if @form && @form.should_send_email?
      
      flash[:notice] = 'Great! Thanks for signing up!'
      redirect_back_or_default reserver_path(@reserver)
    else
      render :action => :new
    end
  end

  def edit
    render :layout => false if request.xhr?
  end
  
  def update
    if @reserver.update_attributes(params)
      flash[:notice] = "#{@reserver.name.possessive} account has been updated!"
      redirect_back_or_default reserver_path(@reserver)
    else
      render :action => :edit
    end
  end
  
  def destroy
    if @reserver.destroy
      flash[:notice] = @reserver.name + ' DESTROYED!'
      redirect_to reservers_path
    else
      flash[:error] = 'Error destroying ' + @reserver.name
      render :action => 'edit'
    end
  end
  
  private
  
  def get_roles
    @roles = is_admin? ? Role.all : Role.non_admin_roles
  end
  
end
