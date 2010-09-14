class AdminController < ApplicationController
  before_filter :authorize_user
  
  def index
    @controllers.reject! { |c| c =~ /(admin)/i }
  end

  def show
  end

  def new
  end

  def create
  end

  def edit
  end

  def update
  end

end
