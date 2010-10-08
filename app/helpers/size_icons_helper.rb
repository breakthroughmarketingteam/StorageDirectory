module SizeIconsHelper
  
  def select_tag_for_unit_size_icons(field_name)
    icon_option_tags = @unit_size_icons.map { |s| "<option value='#{s.dimensions}' rel='#{s.icon.url}'#{' selected="selected"' if params[field_name.to_sym] == s.dimensions}>#{s.dimensions}</option>" }
    select_tag field_name, icon_option_tags
  end
  
end
