class InactiveClientsController < ApplicationController
  
  ssl_required :index
  
  def index
    @clients = Client.inactive.paginate :per_page => @per_page, :page => params[:page]
    render :layout => false if request.xhr?
  end

end