class PaymentsController < ApplicationController
  
  before_filter :get_models, :only => :index
  before_filter :get_model, :only => [:show, :edit]
  before_filter :get_transaction_types, :only => [:new, :edit]
  
  require 'GoToBillingLibrary'
  
  def index
  end

  def show
  end

  def new
    @payment = Payment.new
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
  end
  
  private
  
  def get_transaction_types
    @transaction_types = Payment.transaction_types
    @card_types = Payment.card_types
  end

end
