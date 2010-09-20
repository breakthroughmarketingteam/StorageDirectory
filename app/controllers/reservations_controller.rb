class ReservationsController < ApplicationController

  before_filter :get_models_paginated, :only => :index
  before_filter :get_model, :only => [:show, :new, :edit, :update, :destroy]
  before_filter :scrub_comments, :only => :create

  def index
  end

  def show
  end

  def new
    @reservation = Reservation.new
  end
  
  def create
    @reserver = Reserver.find(:first, :conditions => { :email => params[:reserver][:email] }) || Reserver.new(params[:reserver])
    @reservation = @reserver.reservations.build params[:reservation].merge(:status => 'pending')
    @m = @reserver.mailing_addresses.build params[:mailing_address] unless @reserver.has_address?(params[:mailing_address])
    @m.save if @m
    
    if @reserver.save
      respond_to do |format|
        format.html
        format.js do
          render :json => { :success => true, :data => render_to_string(:partial => 'reservations/step2') }
        end
      end
    else
      respond_to do |format|
        format.html
        format.js do
          render :json => { :success => false, :data => model_errors(@reserver, @m) }
        end
      end
    end
  end

  def edit
  end
  
  def update
    @reserver = @reservation.reserver
    @b = @reserver.billing_infos.build params[:billing_info]
    raise @b.pretty_inspect
  end
  
  def destroy
  end
  
  private
  
  def scrub_comments
    params[:reserver][:reservations_attributes].delete(:comments_attributes) if params[:reserver][:reservations_attributes][:comments_attributes].any? { |c| c[:comment].blank? } rescue false
  end
  
  def send_notices
    Notifier.deliver_tenant_confirmation @reserver, @reservation
    Notifier.deliver_admin_reservation_alert @reserver, @reservation, @reservation.comments
  end
  
end
