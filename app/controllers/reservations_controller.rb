class ReservationsController < ApplicationController

  before_filter :get_models_paginated, :only => :index
  before_filter :get_model, :only => [:show, :new, :edit, :update, :destroy]
  before_filter :scrub_comments, :only => :create

  def index
    render :layout => false if request.xhr?
  end

  def show
    render :layout => false if request.xhr?
  end

  def new
    @reservation = Reservation.new
    render :layout => false if request.xhr?
  end
  
  def create
    split_name_param!
    @reserver = Reserver.find(:first, :conditions => { :email => params[:reserver][:email] }) || Reserver.new(params[:reserver])
    @reservation = @reserver.reservations.build params[:reservation].merge(:status => 'pending')
    @m = @reserver.mailing_addresses.build params[:mailing_address] unless @reserver.has_address?(params[:mailing_address])
    @m.save(false) if @m
    
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
          render :json => { :success => false, :data => model_errors(@reserver, @reservation, @m) }
        end
      end
    end
  end

  def edit
    render :layout => false if request.xhr?
  end
  
  def update
    @reserver = @reservation.reserver
    @billing = @reserver.billing_info || @reserver.billing_infos.create
    @billing.update_attributes params[:billing_info]
    
    @response = @reservation.process_new_tenant @billing
    
    if @response['sErrorMessage'].blank? && @reserver.save
      render :json => { :success => true, :data => render_to_string(:partial => 'reservations/step3') }
    else
      render :json => { :success => false, :data => (@response['sErrorMessage'].blank? ? model_errors(@reserver) : @response['sErrorMessage']) }
    end
  #rescue => e
  #  render :json => { :success => false, :data => e.message }
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
  
  def split_name_param! # we use a simple 'Your Name' field rather than 2 separate fields
    name = params[:reserver].delete :name
    params[:reserver][:first_name] = name.split(' ')[0]
    params[:reserver][:last_name] = name.split(' ')[1]
  end
  
end
