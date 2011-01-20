module UsersHelper
  
  def user_account_title
    return unless params[:id] && user = User.find(params[:id])
    user.id == current_user.id ? 'Your Account' : "#{user.name.possessive} Account"
  end
  
  def render_hints_for(here, rel = '')
    return nil unless is_owner_editing?
    @hint = current_user.user_hints.find_by_place(here.to_s) unless here.nil?
    render :partial => @hint, :locals => { :rel => rel }
  rescue
    nil
  end
  
  def already_member(data_keys, options = {})
    return '' if current_user
    link_to 'I have an account', '#', options.merge(:id => 'already_member', :'data-ready_member' => data_keys, :title => 'Already have an account with us? Login quickly through here.')
  end
  
end
