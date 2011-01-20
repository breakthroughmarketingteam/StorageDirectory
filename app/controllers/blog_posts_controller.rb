class BlogPostsController < ApplicationController
  
  ssl_required :index, :new, :edit, :update, :destroy
  ssl_allowed :create
  before_filter :get_models_paginated, :only => :index
  before_filter :get_model_by_title_or_id, :only => :show
  before_filter :get_model, :only => [:show, :new, :edit, :update, :destroy]
  before_filter :get_blocks, :only => [:new, :edit]
  before_filter :scrub_blocks_model_attributes_params, :only => [:create, :update]
  
  def index
    render :layout => false if request.xhr?
  end

  def show
    @title = "#{@blog_post.title} - #{@blog_post.tag_list.split(/,\s?/).flatten.map(&:titleize).join(', ')}"
    
    respond_to do |format|
      format.html {}
      format.js do
        render :json => { :success => true, :data => render_to_string(:action => 'show', :layout => false) }
      end
    end
  end

  def new
    render :layout => false if request.xhr?
  end

  def create
    case params[:for] when nil
      @blog_post = current_user.blog_posts.new(params[:blog_post])
    when 'tip'
      @blog_post = BlogPost.new(params[:blog_post])
      @blog_post.tag_list << 'tip'
      Notifier.deliver_new_tip_alert(@blog_post) if @blog_post.valid?
    end
    
    respond_to do |format|
      format.html do
        if @blog_post.save
          flash[:notice] = @blog_post.title + ' has been created.'
      
          case params[:for]
          when nil
            redirect_to blog_posts_path
          when 'tip'
            redirect_to :back
          end
        else
          render :action => 'edit'
        end    
      end
      
      format.js do 
        if @blog_post.save          
          if params[:for] == 'tip'
            render :json => { :success => true, :data => "Thanks for sharing your tip! We'll put it up as soon as we can." }
          else
            flash.now[:notice] = @blog_post.title + ' has been created.'
            get_models_paginated
            render :action => 'index', :layout => false
          end
        else
          flash.now[:error] = model_errors(@blog_post)
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
        if @blog_post.update_attributes(params[:blog_post])
          flash[:notice] = @blog_post.title + ' has been updated.'
          redirect_to :action => 'show'
        else
          render :action => 'edit'
        end
      end
      
      format.js do
        if @blog_post.update_attributes(params[:blog_post])
          flash.now[:notice] = @blog_post.title + ' has been updated.'
          get_models_paginated
          render :action => 'index', :layout => false
        else
          flash.now[:error] = model_errors(@blog_post)
          render :action => 'edit', :layout => false
        end
      end
    end
  end

  def destroy
    if @blog_post.destroy
      flash[:notice] = @blog_post.title + ' DESTROYED!'
      redirect_to blog_posts_path
    else
      flash[:error] = 'Error destroying ' + @blog_post.title
      render :action => 'edit'
    end
  end
  
  def rate
    @blog_post = BlogPost.find(params[:id])
    render :json => { :success => @blog_post.rate(params[:stars], current_user, params[:dimension]) }
  end
  
end