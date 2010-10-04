class HelptextsController < ApplicationController
  before_filter :get_helptext, :except => [:index, :new, :create]
  
  def index
    @helptexts = Helptext.all
    render :layout => false if request.xhr?
  end
  
  def show
    render :layout => false if request.xhr?
  end
  
  def new
    @helptext = Helptext.new
    render :layout => false if request.xhr?
  end

  def create
    @helptext = Helptext.new(params[:helptext])
    
    if @helptext.save
      flash[:notice] = @helptext.title + ' has been created.'
      redirect_back_or_default(helptexts_path)
    else
      render :action => 'edit'
    end
  end

  def edit
    render :layout => false if request.xhr?
  end

  def update
    if @helptext.update_attributes(params[:helptext])
      flash[:notice] = @helptext.title + ' has been updated.'
      redirect_back_or_default(helptexts_path)
    else
      render :action => 'edit'
    end
  end

  def destroy
    if @helptext.destroy
      @helptext.helptext.destroy
      flash[:notice] = @helptext.title + ' DESTROYED!'
    else
      flash[:error] = 'Error destroying ' + @helptext.title
    end
    
    redirect_to helptexts_path
  end

  private
  
  def get_helptext
    @helptext = Helptext.find(params[:id])
  end
  
end
