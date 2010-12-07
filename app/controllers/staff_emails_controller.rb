class StaffEmailsController < ApplicationController
  
  before_filter :get_models_paginated, :only => :index
  
  def index
    render :layout => false if request.xhr?
  end
  
  def destroy
    @client = Client.find params[:client_id]
    @listing = @client.listings.find params[:listing_id]
    @staff_email = @listing.staff_emails.find params[:id]
    
    if @staff_email.destroy
      render :json => { :success => true }
    else
      render :json => { :success => false, :data => "Error deleting staff email #{@staff.email}" }
    end
  end
  
end
