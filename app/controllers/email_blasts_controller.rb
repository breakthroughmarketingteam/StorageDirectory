class EmailBlastsController < ApplicationController
  
  before_filter :get_model_by_title_or_id, :only => :show
  before_filter :get_model, :only => [:new, :edit, :update, :destroy, :blast]
  
  geocode_ip_address :only => :show
  
  def index
    @email_blasts = EmailBlast.all_for_index_view
    render :layout => false if request.xhr?
  end

  def show
    render :layout => 'email_template'
  end

  def new
    render :layout => false if request.xhr?
  end

  def create
    @email_blast = EmailBlast.new params[:email_blast]
    
    respond_to do |format|
      format.html do
        if @email_blast.save
          flash[:notice] = @email_blast.title + ' has been created.'
          redirect_to root_path
        else
          get_associations
          render :action => 'edit'
        end
      end
      
      format.js do
        if @email_blast.save
          flash.now[:notice] = @email_blast.title + ' has been created.'
          get_models_paginated
          render :action => 'index', :layout => false
        else
          flash.now[:error] = model_errors(@email_blast)
          get_associations
          render :action => 'edit', :layout => false
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
        if @email_blast.update_attributes(params[:email_blast])
          flash[:notice] = @email_blast.title + ' has been updated.'
          redirect_to "/look/#{@email_blast.title.parameterize}"
        else
          get_associations
          render :action => 'edit'
        end
      end
      
      format.js do
        if @email_blast.update_attributes(params[:email_blast])
          flash.now[:notice] = @email_blast.title + ' has been updated.'
          get_models_paginated
          render :action => 'index', :layout => false
        else
          flash.now[:error] = model_errors(@email_blast)
          get_associations
          render :action => 'edit', :layout => false
        end
      end
    end
  end

  def destroy
    if @email_blast.destroy
      flash[:notice] = @email_blast.title + ' DESTROYED!'
      redirect_to root_path
    else
      flash[:error] = 'Error destroying ' + @email_blast.title
      render :action => 'edit'
    end
  end
  
  def blast
    case params[:blast_type] when 'blast'
      Client.opted_in.each do |client|
        Blaster.deliver_email_blast client.email, @email_blast, render_to_string(:action => 'show', :layout => 'email_template')
      end
      
      render :json => { :success => true, :data => "Sent to #{Client.opted_in.count} clients." }
    when 'test'
      sent_to = []
      params[:test_emails].split(/,\s?/).each do |email|
        sent_to << email
        Blaster.deliver_email_blast email, @email_blast, render_to_string(:action => 'show', :layout => 'email_template') unless email.blank?
      end
      
      render :json => { :success => true, :data => "Sent to #{sent_to.size}: #{sent_to.join(', ')}" }
    else
      render :json => { :success => false, :data => 'Did not choose blast type' }
    end
  end
  
  private
  
  def get_email_blast
    # monkey patched parameterize method. see: /lib/utility_methods.rb:31
    @email_blast = params[:title] ? EmailBlast.find_by_title_in_params(params[:title]) : EmailBlast.find_by_id(params[:id])
    
    if @email_blast.nil?
      #flash[:warning] = "EmailBlast Not Found"
      @email_blast = EmailBlast.find_by_title 'Home'
    end
  end

end
