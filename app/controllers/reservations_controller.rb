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
    @user.temp_password         = User.rand_password
    @user.password              = @user.temp_password
    @user.password_confirmation = @user.temp_password
    @user.activation_code       = @user.make_activation_code
    @user.status                = 'unverified'
    @user.role_id               = Role.get_role_id('reserver')
    
    @reservation = @user.reservations.build params[:reservation]
    
    raise [params, @reservation, @reservation.comment, @user, @user.mailing_addresses].pretty_inspect
    
    respond_to do |format|
      format.html
      format.js do
        render :text => params
      end
    end
  end

  def edit
  end
  
  def update
  end
  
  def destroy
  end
  
end
