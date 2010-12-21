class UserHintsController < ApplicationController
  
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
    @user_hint = UserHint.new params[:user_hint]
    
    respond_to do |format|
      format.html do 
        if @user_hint.save
          User.add_hint_to_all @user_hint
          flash[:notice] = @user_hint.title + ' has been created.'
          redirect_back_or_default :action => 'index'
        else
          render :action => 'edit'
        end
      end
      
      format.js do
        if @user_hint.save
          User.add_hint_to_all @user_hint
          flash.now[:notice] = @user_hint.title + ' has been created.'
          get_models
          render :action => 'index', :layout => false
        else
          flash.now[:error] = model_errors(@user_hint)
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
        if @user_hint.update_attributes params[:user_hint]
          flash[:notice] = @user_hint.title + ' has been updated.'
          redirect_back_or_default :action => 'show'
        else
          render :action => 'edit'
        end
      end
      
      format.js do
        if @user_hint.update_attributes params[:user_hint]
          flash.now[:notice] = @user_hint.title + ' has been updated.'
          get_models
          render :action => 'index', :layout => false
        else
          flash.now[:error] = model_errors(@user_hint)
          render :action => 'edit', :layout => false
        end
      end
    end
  end

  def destroy
    respond_to do |format|
      format.html do 
        if @user_hint.destroy
          flash[:notice] = @user_hint.title + ' DESTROYED!'
          redirect_back_or_default user_hints_path
        else
          flash[:error] = 'Error destroying ' + @user_hint.title
          render :action => 'edit'
        end
      end
      
      format.js do
        if @user_hint.destroy
          flash.now[:notice] = @user_hint.title + ' DESTROYED!'
          get_models
          render :action => 'index', :layout => false
        else
          flash.now[:error] = 'Error destroying ' + @user_hint.title
          render :action => 'edit', :layout => false
        end
      end
    end
  end
  
  def hide
    toggle true
  end
  
  def open
    toggle false
  end
  
  private
  
  def toggle(state)
    return unless current_user
    @placement = current_user.user_hint_placements.find(params[:id])
    
    if @placement.update_attribute :hide, state
      render :json => { :success => true }
    else
      render :json => { :success => false, :data => model_errors(@placement) }
    end
  end

end
