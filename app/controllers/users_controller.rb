class UsersController < ApplicationController
  before_filter :get_models_paginated, :only => :index
  before_filter :get_model, :only => [:show, :edit, :update, :destroy]
  before_filter :get_roles, :only => [:index, :new, :edit, :create]
  before_filter :get_default_role, :only => :new
  before_filter :require_user, :except => [:new, :create]
  
  def index
    render :layout => false if request.xhr?
  end
  
  def show
    render :layout => false if request.xhr?
  end
  
  def new
    @user = User.new
    render :layout => false if request.xhr?
  end
  
  def create
    @form = Form.find(params[:fid]) unless params[:fid].blank?
    @user = User.new(params[:user])
    
    if @user.save
      #Notifier.deliver_subscriber_notification(@form.recipient, @user, request.host) if @form && @form.should_send_email?
      
      flash[:notice] = 'Great! Thanks for signing up!'
      redirect_back_or_default user_path(@user)
    else
      render :action => :new
    end
  end

  def edit
    render :layout => false if request.xhr?
  end
  
  def update
    if @user.update_attributes(params)
      flash[:notice] = "#{@user.name.possessive} account has been updated!"
      redirect_back_or_default user_path(@user)
    else
      render :action => :edit
    end
  end
  
  def destroy
    if @user.destroy
      flash[:notice] = @user.name + ' DESTROYED!'
      redirect_to users_path
    else
      flash[:error] = 'Error destroying ' + @user.name
      render :action => 'edit'
    end
  end
  
  private
  
  def get_roles
    @roles = is_admin? ? Role.all : Role.non_admin_roles
  end
  
end
