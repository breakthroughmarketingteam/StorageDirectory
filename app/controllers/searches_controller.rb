class SearchesController < ApplicationController
  
  ssl_required :index, :show, :models
  before_filter :get_models_paginated, :only => :index
  before_filter :get_model, :only => [:show, :new, :edit, :update, :destroy]
  
  def index
    render :layout => false if request.xhr?
  end
  
  def show
    
  end
  
  def models
    @model_class = params[:model_class].constantize
    assoc = false
    query = params[:query].try :downcase
    
    conditions = @model_class.searchables.map do |field|
      if @model_class.column_names.include?(field)
        "LOWER(#{@model_class.table_name}.#{field}) LIKE '%#{query}%'"
      else
        assoc = @model_class.column_names.include?(field) ? '' : @model_class.get_assoc_prefix_for(field)
        "LOWER(#{assoc[:prefix]}.#{field}) LIKE '%#{query}%'"
      end
    end.join(' OR ') if @model_class.respond_to? :searchables
    
    options = { :conditions => conditions }
    options.store :include, assoc[:join] if assoc
    @results = @model_class.all options
    
    render :layout => false if request.xhr?
  end
  
end
