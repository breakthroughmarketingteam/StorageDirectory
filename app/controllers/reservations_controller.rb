class ReservationsController < ApplicationController

  before_filter :get_models_paginated, :only => :index
  before_filter :get_model, :only => [:show, :edit, :update, :destroy]

  def index
  end

  def show
  end

  def new
  end
  
  def create
    @user = User.new params[:reserver]
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
          render :json => { :success => false, :data => model_errors(@user) }
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
  
  def send_notices
    Notifier.deliver_admin_reservation_alert @user, @reservation, @reservation.comments unless RAILS_ENV == 'development'
  end
  
end
