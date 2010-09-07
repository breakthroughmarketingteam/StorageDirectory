class PostsController < ApplicationController
  before_filter :get_models_paginated, :only => :index
  before_filter :get_model, :only => [:show, :edit, :update, :destroy]
  before_filter :get_blocks, :only => [:new, :edit]
  
  def index
  end

  def show
  end

  def new
    @post = Post.new
  end

  def create
    case params[:for]
    when nil
      @post = current_user.posts.new(params[:post])
    when 'tip'
      @post = Post.new(params[:post])
      @post.tag_list << 'tip'
    end
    
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

  def edit
  end

  def update
    if @post.update_attributes(params[:post])
      flash[:notice] = @post.title + ' has been updated.'
      redirect_to :action => 'show'
    else
      render :action => 'edit'
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
