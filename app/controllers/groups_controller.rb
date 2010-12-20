class GroupsController < ApplicationController
  
  before_filter :get_model, :only => [:show, :new, :edit, :update, :destroy]
  
  def index
    @groups = Group.all_for_index_view
    render :layout => false if request.xhr?
  end
  
  def show
    render :layout => false if request.xhr?
  end
  
  def new
    render :layout => false if request.xhr?
  end

  def create
    @group = Group.new(params[:group])
    
    if @group.save
      flash[:notice] = @group.name + ' has been created.'
    else
      flash[:error] = model_errors(@group)
    end
    
    redirect_back_or_default groups_path
  end

  def edit
    render :layout => false if request.xhr?
  end

  def update
    if @group.update_attributes(params[:group])
      flash[:notice] = @group.name + ' has been updated.'
    else
      flash[:error] = model_errors(@group)
    end
    
    redirect_back_or_default groups_path
  end

  def destroy
    if @group.destroy
      @group.group.destroy
      flash[:notice] = @group.name + ' DESTROYED!'
    else
      flash[:error] = 'Error destroying ' + @group.name
    end
    
    redirect_back_or_default groups_path
  end
  
end
