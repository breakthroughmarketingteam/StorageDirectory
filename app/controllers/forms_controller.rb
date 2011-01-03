class FormsController < ApplicationController
  
  ssl_required :index, :show, :new, :create, :edit, :update, :destroy
  before_filter :get_models, :only => :index
  before_filter :get_model, :only => [:show, :new, :edit, :update, :destroy]
  before_filter :get_field, :only => [:new, :edit]
  
  def index
    render :layout => false if request.xhr?
  end
  
  def show
    render :layout => false if request.xhr?
  end
  
  def new
    @form = Form.new
    render :layout => false if request.xhr?
  end

  def create
    @form = Form.new(params[:form])
    
    respond_to do |format|
      format.html do
        if @form.save
          flash[:notice] = @form.name + ' has been created.'
          redirect_back_or_default forms_path
        else
          render :action => 'edit'
        end
      end
      
      format.js do
        if @form.save
          flash.now[:notice] = @form.name + ' has been created.'
          get_models
          render :action => 'index', :layout => false
        else
          flash.now[:error] = model_errors(@form)
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
        if @form.update_attributes(params[:form])
          flash[:notice] = @form.name + ' has been updated.'
          redirect_back_or_default forms_path
        else
          render :action => 'edit'
        end
      end
      
      format.js do
        if @form.update_attributes(params[:form])
          flash.now[:notice] = @form.name + ' has been updated.'
          get_models
          render :action => 'index', :layout => false
        else
          flash.now[:error] = model_errors(@form)
          render :action => 'edit', :layout => false
        end
      end
    end
  end

  def destroy
    respond_to do |format|
      format.html do
        if @form.destroy
          flash[:notice] = @form.name + ' DESTROYED!'
        else
          flash[:error] = 'Error destroying ' + @form.name
        end

        redirect_back_or_default forms_path
      end
      
      format.js do
        if @form.destroy
          flash.now[:notice] = @form.name + ' DESTROYED!'
        else
          flash.now[:error] = 'Error destroying ' + @form.name
        end

        get_models
        render :action => 'index', :layout => false
      end
    end
  end

  private
  
  def get_field
    @field ||= Field.new :form_id => (@form.try(:id) || 0)
  end
  
end
