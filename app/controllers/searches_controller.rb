class SearchesController < ApplicationController
  
  ssl_required :index, :show, :models
  before_filter :get_models_paginated, :only => :index
  before_filter :get_model, :only => [:show, :new, :edit, :update, :destroy]
  
  def index
    render :layout => false if request.xhr?
  end
  
  def show
    render :layout => false if request.xhr?
  end
  
  # search any model which responds to :searchables
  def models
    @model_class = params[:model_class].constantize
    assoc = false
    query = params[:query]
    
    unless query.blank?
      query = query.downcase.gsub(/<\/?[^>]*>/, "")
      like_operator = RAILS_ENV == 'development' ? ') LIKE' : 'ILIKE'
      
      conditions = @model_class.searchables.map do |field|
        if @model_class.column_names.include?(field)
          "#{RAILS_ENV == 'development' ? 'LOWER(' : ''}#{@model_class.table_name}.#{field} #{like_operator} '%#{query}%'"
        else
          assoc = @model_class.column_names.include?(field) ? '' : @model_class.get_assoc_prefix_for(field)
          "#{assoc[:prefix]}.#{field} #{like_operator} '%#{query}%'"
        end
      end.join(' OR ') if @model_class.respond_to? :searchables
    
      options = { :conditions => conditions }
      options.store :include, assoc[:join] if assoc
      
      @results = @model_class.all options
    else
      flash[:error] = 'Type something in to search for, DUH'
    end
    
    render :layout => false if request.xhr?
  end
  
end
