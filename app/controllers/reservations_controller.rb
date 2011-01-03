class ReservationsController < ApplicationController
  
  ssl_required :index, :show, :new, :create, :edit, :update, :destroy
  before_filter :get_models_paginated, :only => :index
  before_filter :scrub_comments, :only => :create

  def index
    render :layout => false if request.xhr?
  end

  def show
    render :layout => false if request.xhr?
  end

  def new
    render :layout => false if request.xhr?
  end
  
  def create
    split_name_param!
    @reserver = Tenant.find(:first, :conditions => { :email => params[:reserver][:email] }) || Tenant.new(params[:reserver])

    # reservation_id comes through if the user had gone back and changed an input in the first step, if the user changed their email, we won't find the reservation, so fallback to build
    @reservation = @reserver.reservations.find_by_id(params[:reservation_id]) || @reserver.reservations.build
    @reservation.attributes = params[:reservation].merge(:status => 'pending')
    
    @m = @reserver.mailing_addresses.build params[:mailing_address] unless @reserver.has_address?(params[:mailing_address])
    @m.save(false) if @m
    
    @reservation.size.update_reserve_costs!
    
    if @reserver.save
      @reservation.save
      session.clear if current_user && current_user.status == 'unverified'
      
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
  
  # we would arrive here if there is a second step in the reserve process, only for issn enabled listings
  def update
    @reserver = @reservation.reserver
    @billing = @reserver.billing_info || @reserver.billing_infos.create
    @billing.update_attributes params[:billing_info]
    
    @response = @reservation.process_new_tenant @billing
    
    if IssnAdapter.no_fatal_error?(@response['sErrorMessage']) && @reserver.save
      @reservation.update_attribute :status, 'paid' if @response['sErrorMessage'].blank?
      send_notices
      
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
  
  def split_name_param! # in the front end we use a simple 'Your Name' field rather than 2 separate fields, we need to split them for the model
    name = params[:reserver].delete :name
    params[:reserver][:first_name] = name.split(' ')[0].titleize
    params[:reserver][:last_name] = name.split(' ')[1, name.split(' ').size-1].join(' ').titleize
  end
  
end
