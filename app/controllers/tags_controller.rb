class TagsController < ApplicationController
  
  ssl_required :index, :show, :new, :create, :edit, :update, :destroy
  before_filter :get_model, :only => [:show, :new, :edit, :update, :destroy]
  
  def index
    @tags = Tag.all
    render :layout => false if request.xhr?
  end
  
  def show
    @models = params[:model].singularize.titleize.constantize.tagged_with params[:tag]
    render :layout => false if request.xhr?
  end
  
  def new
    render :layout => false if request.xhr?
  end

  def create
    @tag = Tag.new params[:tag], params, current_user
    
    if @tag.save
      flash[:notice] = @tag.name + ' has been created.'
    else
      flash[:error] = model_errors(@tag)
    end
    
    redirect_back_or_default tags_path
  end

  def edit
    render :layout => false if request.xhr?
  end

  def update
    if @tag.update_attributes(params[:tag])
      flash[:notice] = @tag.name + ' has been updated.'
    else
      flash[:error] = model_errors(@tag)
    end
    
    redirect_back_or_default tags_path
  end

  def destroy
    if @tag.destroy
      flash[:notice] = @tag.name + ' DESTROYED!'
      redirect_to tags_path
    else
      flash[:error] = 'Error destroying ' + @tag.name
      render :action => 'edit'
    end
  end

end