class ReviewsController < ApplicationController
  
  ssl_required :index, :edit, :update, :destroy
  before_filter :get_review, :only => [:show, :new, :edit, :update, :destroy]
  
  def index
    get_reviews
    render :layout => false if request.xhr?
  end
  
  def show
    render :layout => false if request.xhr?
  end
  
  def new
    render :layout => false if request.xhr?
  end

  def create
    if @review.save
      respond_to do |format|
        format.html do
          flash[:notice] = "Created the review: #{@review.title}"
          current_user ? redirect_back_or_default(reviews_path) : redirect_to(:back)
        end
        
        format.js do
          render :json => { :success => true, :data => "Created the review: #{@review.title}" }
        end
      end
    else
      respond_to do |format|
        format.html { render :action => 'edit' }
        format.js { render :json => { :success => false, :data => model_errors(@review) }}
      end
    end
  end

  def edit
    render :layout => false if request.xhr?
  end

  def update
    respond_to do |format|
      format.html do
        if @review.update_attributes(params[:review])
          flash[:notice] = @review.title + ' has been updated.'
          redirect_back_or_default(reviews_path)
        else
          render :action => 'edit'
        end
      end
      
      format.js do
        if @review.update_attributes(params[:review])
          flash.now[:notice] = @review.title + ' has been updated.'
          get_reviews
          render :action => :index, :layout => false
        else
          flash.now[:error] = 'Error updating ' + @review.title
          render :action => 'edit', :layout => false
        end
      end
    end
  end

  def destroy
    respond_to do |format|
      format.html do
        if @review.destroy
          flash[:notice] = @review.title + ' DESTROYED!'
        else
          flash[:error] = 'Error destroying ' + @review.title
        end
        redirect_to reviews_path
      end
      
      format.js do
        if @review.destroy
          flash.now[:notice] = @review.title + ' DESTROYED!'
          get_reviews
          render :action => :index, :layout => false
        else
          flash.now[:error] = 'Error destroying ' + @review.title
          render :action => :edit, :layout => false
        end
      end
    end
  end
  
  private
  
  def get_reviews
    @reviews = Comment.all(:conditions => { :commentable_type => 'Listing' }).paginate :per_page => (@per_page || 10), :page => params[:page]
  end
  
  def get_review
    @review = Comment.find params[:id]
  end
  
end
