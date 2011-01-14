class PostsController < ApplicationController
  
  ssl_required :index, :show, :new, :edit, :update, :destroy
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
    @title = "#{@post.title} - #{@post.tag_list.split(/,\s?/).flatten.map(&:titleize).join(', ')}"
    
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
      @post = current_user.posts.new(params[:post])
    when 'tip'
      @post = Post.new(params[:post])
      @post.tag_list << 'tip'
      Notifier.deliver_new_tip_alert(@post) if @post.valid?
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
          if params[:for] == 'tip'
            render :json => { :success => true, :data => "Thanks for sharing your tip! We'll put it up as soon as we can." }
          else
            flash.now[:notice] = @post.title + ' has been created.'
            get_models_paginated
            render :action => 'index', :layout => false
          end
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
