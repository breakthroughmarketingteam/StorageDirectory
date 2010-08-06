class UserHintsController < ApplicationController
  before_filter :get_models, :only => [:index, :show, :new, :edit]
  before_filter :get_model, :only => [:show, :edit, :update, :destroy]
  
  def index
  end

  def show
  end

  def new
    @user_hint = UserHint.new
  end
  
  # TODO: too much code in this controller, fix it!
  def create
    error = ''
    
    if params[:user_hints]
      params[:user_hints].each do |user_hint|
        @user_hint = UserHint.new(user_hint) unless user_hint[:title].blank?
        error << model_errors(@user_hint) unless @user_hint.save
      end
    else
      @user_hint = UserHint.new(params[:user_hints])
      error << model_errors(@user_hint) unless @user_hint.save
    end
    
    if error.blank?
      flash[:notice] = "#{params[:user_hints].nil? ? 'UserHint has' : 'UserHints have'} been created."
      redirect_back_or_default user_hints_path
    else
      flash[:error] = 'Oops, something went wrong.'
      @user_hint.nil? ? render(:action => 'edit') : redirect_back_or_default(user_hints_path)
    end    
  end

  def edit
  end

  def update
    if @user_hint.update_attributes(params[:user_hint])
      flash[:notice] = @user_hint.title + ' has been updated.'
      redirect_back_or_default :action => 'show'
    else
      render :action => 'edit'
    end
  end

  def destroy
    if @user_hint.destroy
      flash[:notice] = @user_hint.title + ' DESTROYED!'
      redirect_back_or_default user_hints_path
    else
      flash[:error] = 'Error destroying ' + @user_hint.title
      render :action => 'edit'
    end
  end

end
