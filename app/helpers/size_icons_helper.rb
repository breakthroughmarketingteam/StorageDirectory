module SizeIconsHelper
  
  def select_tag_for_unit_size_icons(field_name, selected, options = {})
    icon_option_tags = SizeIcon.medium_icons.map { |s| "<option value='#{s.dimensions}' data-url='#{s.icon.url}'#{' selected="selected"' if selected == s.dimensions}>#{s.dimensions}</option>" }
    select_tag field_name, icon_option_tags, options
  end
  
  def select_tag_for_facility_sizes_icons(field_name, sizes, selected, options = {})
    icon_option_tags = sizes.map { |s| "<option value='#{s.id}' data-unit-type='#{s.title.downcase}' data-unit-price='#{s.dollar_price}' data-url='#{s.icon(:medium).try :url}'#{' selected="selected"' if selected && selected == s.dims}>#{s.dims}</option>"}
    select_tag field_name, icon_option_tags, options 
  end
  
end