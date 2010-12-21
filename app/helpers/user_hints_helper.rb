module UserHintsHelper
  
  def all_hints_hidden_for?(user)
    user.user_hint_placements.map.all? &:hide? if user.respond_to? :user_hints
  end
  
end