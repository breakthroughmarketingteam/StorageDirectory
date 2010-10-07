class TagsController < ApplicationController
  before_filter :get_tag, :only => [:edit, :update, :destroy]
  
  def index
    @tags = Tag.all
    render :layout => false if request.xhr?
  end
  
  def show
    @models = params[:model].singularize.titleize.constantize.tagged_with params[:tag]
    render :layout => false if request.xhr?
  end
  
  def new
    @tag = Tag.new
    render :layout => false if request.xhr?
  end

  def create
    @tag = Tag.new(params[:tag], params, current_user)
    
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

  private
  
  def get_tag
    @tag = Tag.find(params[:id])
  end

end
