class PredefSpecialAssignsController < ApplicationController
  
  def create
    @predef_special_assign = PredefSpecialAssign.new params[:predef_special_assign]
    
    if @predef_special_assign.save
      render :json => { :success => true }
    else
      render :json => { :success => false, :data => model_errors(@predef_special_assign) }
    end
  end
  
end
