class ReservationsController < ApplicationController

  before_filter :get_models_paginated, :only => :index
  before_filter :get_model, :only => [:show, :edit, :update, :destroy]
  before_filter :scrub_comments

  def index
  end

  def show
  end

  def new
  end
  
  def create
    @user = User.find_by_email(params[:reserver][:email]) || User.new(params[:reserver])
    @user.role_id = tenant_role.id if @user.new_record?
    @reservation = @user.reservations.build params[:reservation]
    
    if @user.save
      send_notices
      
      respond_to do |format|
        format.html
        format.js do
          render :json => { :success => true }
        end
      end
    else
      respond_to do |format|
        format.html
        format.js do
          render :json => { :success => false, :data => model_errors(@reservation, @user) }
        end
      end
    end
  end

  def edit
  end
  
  def update
  end
  
  def destroy
  end
  
  private
  
  def scrub_comments
    params[:reservation].delete(:comments_attributes) if params[:reservation][:comments_attributes].any? { |c| c[:comment].blank? }
  end
  
  def send_notices
    Notifier.deliver_tenant_confirmation @user, @reservation
    Notifier.deliver_admin_reservation_alert @user, @reservation, @reservation.comments
  end
  
end
