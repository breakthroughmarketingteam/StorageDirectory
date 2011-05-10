class PaymentsController < ApplicationController
  
  ssl_required :index, :show, :new, :create, :edit, :update, :destroy
  before_filter :get_models_paginated, :only => :index
  before_filter :get_model, :only => [:show, :new, :edit, :update, :destroy]
  before_filter :get_transaction_types, :only => [:new, :edit]
  
  require 'gtblib'
  
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
    @transaction = GoToBilling.new
    @transaction.customer_info(params[:client].merge({ :user_id => 'test' }))
    @transaction.transaction_info(params[:payment].merge({ :invoice_id => 'test' }))
    @transaction.card_info(params[:cc])
    @transaction.process
    
    raise @transaction.response.pretty_inspect
  end

  def edit
    render :layout => false if request.xhr?
  end
  
  private
  
  def get_transaction_types
    @transaction_types = Payment.transaction_types
    @card_types = Payment.card_types
  end

end
