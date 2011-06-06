class SubscribersController < ApplicationController
  
  ssl_required :index, :show, :new, :edit, :update, :destroy, :activation
  before_filter :get_models_paginated, :only => :index
  before_filter :get_subscriber, :only => [:show, :new, :edit, :update, :destroy]
  
  def index
    render :layout => false if request.xhr?
  end

  def show
    render :layout => false if request.xhr?
  end

  def new
    @subscriber = Subscriber.new
    render :layout => false if request.xhr?
  end
  
  def create
    @subscriber = Subscriber.find_by_email(params[:subscriber][:email]) || Subscriber.new(params[:subscriber])
    
    respond_to do |format|
      format.html {}
      format.js do
        if @subscriber.save_without_session_maintenance
          render :json => { :success => true, :data => "Thanks for subscribing!" }
        else
          render :json => { :success => false, :data => model_errors(@subscriber) }
        end
      end
    end
  end
    
  def edit
    render :layout => false if request.xhr?
  end
  
  def update
    respond_to do |format|
      format.html do
        if @subscriber.update_attributes params[:subscriber]
          flash[:notice] = "#{@subscriber.name.possessive} subscription has been updated!"
          redirect_back_or_default subscriber_path(@subscriber)
        else
          render :action => :edit
        end
      end
      
      format.js do
        if @subscriber.update_attributes params[:subscriber]
          flash.now[:notice] = "#{@subscriber.name.possessive} subscription has been updated!"
          render :action => 'edit', :layout => false
        else
          flash.now[:error] = model_errors @subscriber
          render :action => 'edit', :layout => false
        end
      end
    end
  end
  
  def activate
    @subscriber = Subscriber.find_by_activation_code params[:code]
    
    case @subscriber.status when 'unverified'
      @subscriber.update_attribute :status, 'active'
      flash[:quick_login] = [@subscriber.email, @subscriber.temp_password]
      flash[:notice] = 'Congratulations! Your subscription is now active. Go ahead and log in.'
      redirect_to login_path
      
    when 'active'
      flash[:quick_login] = [@subscriber.email, @subscriber.temp_password]
      flash[:notice] = 'Your subscription has already been activated. Go ahead and log in.'
      redirect_to login_path
      
    when 'suspended'
      flash[:error] = 'Sorry, your subscription is suspended. Contact us if you think you\'re receiving this message in error.'
      redirect_to root_path
    end
  end
  
  def resend_activation
    @subscriber = Subscriber.find_by_activation_code params[:code]
    Notifier.delay.deliver_subscriber_notification @subscriber
    
    render :json => { :success => true }
  rescue => e
    render :json => { :success => false, :data => e.message }
  end
  
  private
  
  def get_subscriber
    @subscriber = current_user && current_user.has_role?('admin', 'staff') ? Subscriber.find(params[:id]) : current_user
  end
  
end