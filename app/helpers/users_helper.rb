module UsersHelper
  
  def user_account_title
    return unless params[:id] && user = User.find(params[:id])
    user.id == current_user.id ? 'Your Account' : "#{user.name.possessive} Account"
  end
  
  def render_hints_in(place)
    return if place.nil?
    
    
  end
  
end
