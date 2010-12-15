module FormsHelper
  
  def block_form_object(form, block)
    block_form = BlockForm.find(:first, :conditions => { :form_id => form.id, :block_id => block.id })
    block_form ? block_form : BlockForm.new
  end
  
  # TODO: fix this, it should give us the right path to a create action taking into account the scope
  def virtual_form_path(form)
    unless form.scope.blank? || form.target_id.blank?
      model = model_class(form.scope).find(form.target_id) if model_class(form.scope).exists?(form.target_id)
      model_path model
    else
      form.controller.singular.to_sym
    end
  end
  
end
