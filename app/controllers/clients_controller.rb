class ClientsController < ApplicationController
  
  ssl_required :index, :new, :create, :show, :edit, :edit_info, :update, :new_manager, :verify, :activate, :verify_listings, :create_note, :delete_note
  skip_before_filter :simple_auth, :only => :activate
  before_filter :get_model, :only => [:show, :update, :destroy, :verify]
  before_filter :get_client, :only => [:edit, :edit_info, :verify_listings, :new_manager]
  
  def index
    options = ops_with_sort(:conditions => { :status => 'active' }, :per_page => @per_page, :page => params[:page])
    @clients = Client.paginate :all, options
    render :layout => false if request.xhr?
  end

  def show
    render :layout => false if request.xhr?
  end

  def new
    @page = Page.find_by_title 'Self Storage Advertising'
    @client = Client.new
    @listing = Listing.find params[:listing_id] if params[:listing_id]

    render :layout => false if request.xhr?
  end
  
  def create
    @client = Client.new params
    
    if @client.save
      # authorize card only
      @client.process_billing_info! @client.billing_info, :tran_type => 'AS', :occurence_number => 1, :notes => 'USSSL Sign Up Authorization' do |response|
        @client.errors.add_to_base "Authorization Error: #{response[:description]}" if response[:status] != 'G'
      end
      
      if @client.errors.empty?
        Notifier.delay.deliver_client_notification @client
        Notifier.delay.deliver_new_client_alert @client
      
        render :json => { :success => true, :data => { :activation_code => @client.activation_code } }
      else
        @client.destroy
        render :json => { :success => false, :data => model_errors(@client) }
      end
    else
      render :json => { :success => false, :data => model_errors(@client) }
    end
  end
    
  def edit
    redirect_to client_account_path if params[:id] && (current_user && current_user.has_role?('advertiser'))
    
    if @client.nil?
      redirect_to new_client_path
    else
      @title = current_user.company
      @listings = @client.listings.paginate(:conditions => 'enabled IS TRUE', :per_page => 10, :page => params[:page], :order => 'id DESC')
      @settings = @client.settings || @client.build_settings
      @client_welcome = Post.tagged_with('client welcome').last.content if !is_admin? && @client.login_count == 1
      #@graph = open_flash_chart_object 700, 300, "/ajax/bar_3d?model=Client&id=#{@client.id}", false
      
      render :layout => false if request.xhr?
    end
  end
  
  def edit_info
    @billing_info = @client.billing_info || @client.build_billing_info
    @mailing_address = @client.mailing_address || @client.build_mailing_address
    
    render :json => { :success => true, :data => render_to_string(:layout => false) }
  rescue => e
    render :json => { :success => false, :data => e.message }
  end
  
  def update    
    respond_to do |format|
      if @client.update_info params[:client], params[:billing_update]
        format.html do
          flash[:notice] = "#{params[:partial].titleize} updated successfully"
          redirect_to :action => 'edit'
        end
        
        format.js do
          case params[:partial] when 'user_info'
            render :action => :show, :layout => false
          else
            render :json => { :success => true, :data => render_to_string(:partial => params[:partial]) }
          end
        end
        
      else
        format.html do
          flash[:error] = model_errors(@client)
          redirect_to :action => 'edit'
        end
        
        format.js do
          render :json => { :success => false, :data => model_errors(@client) }
        end
      end
    end
  end
  
  def new_manager
    raise [params, @client].pretty_inspect
  end
  
  def activate
    @client = Client.find_by_activation_code params[:code]
    
    if @client.nil?
      flash[:error] = "We couldn't find that account, make sure you used the correct link or that you copied it completely."
      redirect_to login_path
    else
      case @client.status when 'unverified'
        @client.activate!
        Notifier.delay.deliver_client_activated_alert @client
        
        flash[:quick_login] = [@client.email, @client.temp_password]
        flash[:notice] = 'Congratulations! Your account is ready. Go ahead and log in.'
        redirect_to login_path
      
      when 'active'
        flash[:quick_login] = [@client.email, @client.temp_password]
        flash[:notice] = 'Your account is already active. Go ahead and log in.'
        redirect_to login_path
      
      when 'suspended'
        flash[:error] = 'Your account is suspended.'
        redirect_to root_path
      end
    end
  end
  
  def resend_activation
    @client = Client.find_by_activation_code params[:code]
    Notifier.delay.deliver_client_notification @client
    
    render :json => { :success => true }
  rescue => e
    render :json => { :success => false, :data => e.message }
  end
  
  def verify
    if @client.update_attribute :verification_sent_at, Time.now
      @partial = 'activation_email'
      Blaster.delay.deliver_html_email @client.email, 'Your account is ready at USSelfStorageLocator.com', render_to_string(:layout => 'email_template')
    
      respond_to do |format|
        format.html { redirect_back_or_default '/admin' }
        format.js { render :json => { :success => true } }
      end
    end
  end
  
  def verify_listings
    @claimed_listings = ClaimedListing.find params[:claimed_listing_ids]
    @listings = Listing.find @claimed_listings.map(&:listing_id) if @claimed_listings
    @client.listings << @listings
    
    if @listings
      @client.enable_listings!
      @client.save
      @claimed_listings.map &:destroy
      Notifier.delay.deliver_activated_listings_notification @client, @listings
      
      respond_to do |format|
        format.html { redirect_back_or_default '/admin' }
        format.js { render :json => { :success => true } }
      end
    end
  end
  
  def create_note
    @client = Client.find params[:id]
    @note = @client.notes.build params[:note].merge(:created_by => current_user.id)
    
    respond_to do |format|
      format.html do 
        if @note.save
          flash[:notice] = @note.title + ' has been created.'
          redirect_back_or_default :action => 'index'
        else
          render :action => 'show'
        end
      end
      
      format.js do
        if @note.save
          flash.now[:notice] = @note.title + ' has been created.'
          get_models
          render :action => 'show', :layout => false
        else
          flash.now[:error] = model_errors(@note)
          render :action => 'show', :layout => false
        end
      end
    end
  end
  
  def delete_note
    @client = Client.find params[:id]
    @note = @client.notes.find params[:note_id]
    
    respond_to do |format|
      format.html do 
        if @note.destroy
          flash[:notice] = @note.title + ' DESTROYED!'
          redirect_back_or_default notes_path
        else
          flash[:error] = 'Error destroying ' + @note.title
          render :action => 'edit'
        end
      end
      
      format.js do
        if @note.destroy
          flash.now[:notice] = @note.title + ' DESTROYED!'
          get_models
          render :action => 'show', :layout => false
        else
          flash.now[:error] = 'Error destroying ' + @note.title
          render :action => 'show', :layout => false
        end
      end
    end
  end
  
  def test_issn
    if @client.issn_test params[:facility_id], (params[:enable_test] == 'true' ? true : false)
      response = 'Data Sync Complete'
    else
      response = 'ISSN Test Disabled'
    end
    
    render :json => { :success => true, :data => response }
  rescue => e
    render :json => { :success => false, :data => e.message }
  end
  
  private
  
  def get_client
    @client = user_is_a?('admin', 'staff') ? Client.find_by_id(params[:id]) : current_user
  end
  
end
