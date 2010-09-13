module UsersHelper
  
  def user_account_title
    return unless params[:id] && user = User.find(params[:id])
    user.id == current_user.id ? 'Your Account' : "#{user.name.possessive} Account"
  end
  
  def render_hints_for(here)
    return nil unless is_facility_owner?
    @hint = current_user.user_hints.find_by_place(here.to_s) unless here.nil?
    render :partial => @hint unless @hint.placement(current_user).hide? 
  rescue
    nil
  end
  
end
