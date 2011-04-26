class NotesController < ApplicationController
  
  ssl_required :index, :show, :new, :create, :edit, :update, :destroy
  before_filter :get_models, :only => [:index, :show, :new, :edit]
  before_filter :get_model, :only => [:show, :new, :edit, :update, :destroy]
  
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
    @client = Client.find params[:client_id]
    @note = @client.notes.build params[:note].merge(:created_by => current_user.id)
    
    respond_to do |format|
      format.html do 
        if @note.save
          flash[:notice] = @note.title + ' has been created.'
          redirect_back_or_default :action => 'index'
        else
          render :action => 'edit'
        end
      end
      
      format.js do
        if @note.save
          flash.now[:notice] = @note.title + ' has been created.'
          get_models
          render :text => render_to_string(:controller => 'clients', :action => 'edit', :layout => false)
        else
          flash.now[:error] = model_errors(@note)
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
        if @note.update_attributes params[:note]
          flash[:notice] = @note.title + ' has been updated.'
          redirect_back_or_default :action => 'show'
        else
          render :action => 'edit'
        end
      end
      
      format.js do
        if @note.update_attributes params[:note]
          flash.now[:notice] = @note.title + ' has been updated.'
          get_models
          render :action => 'index', :layout => false
        else
          flash.now[:error] = model_errors(@note)
          render :action => 'edit', :layout => false
        end
      end
    end
  end

  def destroy
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
          render :action => 'index', :layout => false
        else
          flash.now[:error] = 'Error destroying ' + @note.title
          render :action => 'edit', :layout => false
        end
      end
    end
  end

end
