class PostsController < ApplicationController
  before_filter :get_models_paginated, :only => :index
  before_filter :get_model, :only => [:show, :edit, :update, :destroy]
  before_filter :get_blocks, :only => [:new, :edit]
  
  caches_page :index, :show
  cache_sweeper :page_sweeper, :only => [:create, :update, :destroy]
  
  def index
    render :layout => false if request.xhr?
  end

  def show
    @post ||= Post.find :first, :conditions => ['LOWER(title) = ?', params[:title].gsub('-', ' ')]
    render :layout => false if request.xhr?
  end

  def new
    @post = Post.new
    render :layout => false if request.xhr?
  end

  def create
    case params[:for]
    when nil
      @post = current_user.posts.new(params[:post])
    when 'tip'
      @post = Post.new(params[:post])
      @post.tag_list << 'tip'
    end
    
    respond_to do |format|
      format.html do
        if @post.save
          flash[:notice] = @post.title + ' has been created.'
      
          case params[:for]
          when nil
            redirect_to posts_path
          when 'tip'
            redirect_to :back
          end
        else
          render :action => 'edit'
        end    
      end
      
      format.js do 
        if @post.save
          flash.now[:notice] = @post.title + ' has been created.'
          get_models_paginated
          render :action => 'index', :layout => false
        else
          flash.now[:error] = model_errors(@post)
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
        if @post.update_attributes(params[:post])
          flash[:notice] = @post.title + ' has been updated.'
          redirect_to :action => 'show'
        else
          render :action => 'edit'
        end
      end
      
      format.js do
        if @post.update_attributes(params[:post])
          flash.now[:notice] = @post.title + ' has been updated.'
          get_models_paginated
          render :action => 'index', :layout => false
        else
          flash.now[:error] = model_errors(@post)
          render :action => 'edit', :layout => false
        end
      end
    end
  end

  def destroy
    if @post.destroy
      flash[:notice] = @post.title + ' DESTROYED!'
      redirect_to posts_path
    else
      flash[:error] = 'Error destroying ' + @post.title
      render :action => 'edit'
    end
  end
  
  def rate
    @post = Post.find(params[:id])
    render :json => { :success => @post.rate(params[:stars], current_user, params[:dimension]) }
  end
  
end
