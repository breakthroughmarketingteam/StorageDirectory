class UserStatsController < ApplicationController
  
  ssl_required :index
  ssl_allowed :update, :show
  skip_before_filter :simple_auth, :only => :update
  before_filter :get_models_paginated, :only => :index
  
  def index
    render :layout => false if request.xhr?
  end
  
  def show
    @user_stat = UserStat.find params[:id]
    render :layout => false if request.xhr?
  end

  def update
    render :nothing => true and return if current_user.nil?
    @user_stat = current_user.user_stats.find params[:id]
    @user_stat.update_attributes :browser_vars => params[:browser_vars]
    render :nothing => true
  end

end
