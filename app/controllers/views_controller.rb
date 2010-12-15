class ViewsController < ApplicationController
  
  before_filter :get_view, :except => [:index, :new, :create]
  
  def index
    @views = View.all_for_index_view
    render :layout => false if request.xhr?
  end

  def show
    render :layout => false if request.xhr?
  end

  def new
    @view = View.new
    render :layout => false if request.xhr?
  end

  def create
    @view = View.new(params[:view])
    
    if @view.save
      flash[:notice] = @view.name + ' has been created.'
      redirect_back_or_default views_path
    else
      render :action => 'edit'
    end
  end

  def edit
    render :layout => false if request.xhr?
  end

  def update
    if @view.update_attributes(params[:view])
      flash[:notice] = @view.name + ' has been updated.'
      redirect_back_or_default views_path
    else
      render :action => 'edit'
    end
  end

  def destroy
    if @view.destroy
      flash[:notice] = @view.name + ' DESTROYED!'
      redirect_back_or_default views_path
    else
      flash[:error] = 'Error destroying ' + @view.name
      render :action => 'edit'
    end
  end
  
  private
  
  def get_view
    @view = View.find(params[:id])
  end
  
end
