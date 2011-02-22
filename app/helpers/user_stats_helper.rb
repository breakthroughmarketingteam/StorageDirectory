module UserStatsHelper
  
  def get_stat_path_by_user user_stat
    eval "#{current_user.class.name.underscore}_user_stat_path current_user, user_stat"
  end
  
end
