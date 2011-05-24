class UnsubsController < ApplicationController
  
  ssl_required :create
  skip_before_filter :simple_auth, :only => :create
  
  def create
    @model = params[:class_name].constantize.find_by_email params[:email] rescue nil

    if @model
      @unsub = model.unsubs.create :name => params[:list]
      flash[:notice] = "You have been unsubscribe from the list: #{@unsub.name.titleize}"
    else
      flash[:error] = "Could not find that subscriber. Is the URL correct?"
    end
  end

end
