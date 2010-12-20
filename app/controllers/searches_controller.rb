class SearchesController < ApplicationController
  
  before_filter :get_models_paginated, :only => :index
  before_filter :get_model, :only => [:show, :new, :edit, :update, :destroy]
  
  def index
    render :layout => false if request.xhr?
  end
  
  def show
    
  end
  
end
