class BlocksController < ApplicationController
  
  before_filter :get_model, :only => [:show, :new, :edit, :update, :destroy]
  before_filter :get_associations, :only => [:new, :edit]
  
  def index
    @blocks = Block.all_for_index_view
    render :layout => false if request.xhr?
  end

  def show
    render :layout => false if request.xhr?
  end

  def new
    render :layout => false if request.xhr?
  end

  def create
    @block = Block.new(params[:block])
    @block.update_assoc(:models_views, params[:models_views])
    @block.update_assoc(:block_forms, params[:block_forms])
    
    respond_to do |format|
      format.html do
        if @block.save
          flash[:notice] = @block.title + ' has been created.'
          redirect_back_or_default blocks_path
        else
          get_associations
          render :action => 'edit'
        end
      end
      
      format.js do
        if @block.save
          flash.now[:notice] = @block.title + ' has been created.'
          @blocks = Block.all_for_index_view
          @blocks = Block.all_for_index_view
          render :action => :index, :layout => false
        else
          flash.now[:error] = model_errors(@block)
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
    @block.update_assoc(:models_views, params[:models_views])
    @block.update_assoc(:block_forms, params[:block_forms])
    
    respond_to do |format|
      format.html do
        if @block.update_attributes(params[:block])
          flash[:notice] = @block.title + ' has been updated.'
          redirect_back_or_default blocks_path
        else
          get_associations
          render :action => 'edit'
        end
      end
      
      format.js do
        if @block.update_attributes(params[:block])
          flash.now[:notice] = @block.title + ' has been updated.'
          @blocks = Block.all_for_index_view
          @blocks = Block.all_for_index_view
          render :action => 'index', :layout => false
        else
          flash.now[:error] = model_errors(@block)
          get_associations
          render :action => 'edit', :layout => false
        end
      end
    end
  end

  def destroy
    if @block.destroy
      flash[:notice] = @block.title + ' DESTROYED!'
    else
      flash[:error] = 'Error destroying ' + @block.title
    end
    
    redirect_back_or_default blocks_path
  end
  
  private
  
  def get_associations
    @views = View.all
    @forms = Form.all
  end
  
end
