class CommentsController < ApplicationController
  
  ssl_required :index, :edit, :update, :destroy
  before_filter :get_models_paginated, :only => :index
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
    @form = Form.find(params[:fid]) unless params[:fid].blank?
    
    unless params[:target_type].blank?
      @comment = params[:target_type].camelcase.constantize.find(params[:target_id]).comments.build(params[:comment])
    else
      get_active_model
      @comment = @active_model ? @active_model.comments.build(params[:comment]) : Comment.new(params[:comment])
    end
    
    @comment.user_id = current_user.id if current_user
    @comment.status = params[:do_review] ? 'unpublished' : 'published'
    
    if @comment.save
      if @form && @form.should_send_email?
        Notifier.deliver_comment_notification(@form.recipient, @comment, request.host)
      end
      
      if params[:target_type].blank?
        msg = 'Thanks for the message! We\'ll get back to you soon'
      elsif params[:do_review]
        Notifier.delay.deliver_review_alert @comment
        msg = 'Thank you. We greatly appreciate the review!'
      else
        msg = "#{params[:target_type].titleize} comment created."
      end
      
      respond_to do |format|
        format.html do
          flash[:notice] = msg
          current_user ? redirect_back_or_default(comments_path) : redirect_to(:back)
        end
        
        format.js do
          render :json => { :success => true, :data => msg }
        end
      end
    else
      respond_to do |format|
        format.html { render :action => 'edit' }
        format.js { render :json => { :success => false, :data => model_errors(@comment) }}
      end
    end
  end

  def edit
    render :layout => false if request.xhr?
  end

  def update
    if @comment.update_attributes(params[:comment])
      flash[:notice] = @comment.title + ' has been updated.'
      redirect_back_or_default(comments_path)
    else
      render :action => 'edit'
    end
  end
  
  def contact
    @page = Page.find_by_title 'Contact Us'
    @comment = @page.comments.build params[:comment]
    
    if @comment.save
      Notifier.delay.deliver_new_contact_alert @comment, @page
      render :json => { :success => true, :data => render_to_string(:partial => '/comments/contacted') }
    else
      render :json => { :success => false, :data => model_errors(@comment) }
    end
  end

  def destroy
    if @comment.destroy
      flash[:notice] = @comment.title + ' DESTROYED!'
    else
      flash[:error] = 'Error destroying ' + @comment.title
    end
    
    redirect_to comments_path
  end
  
end
