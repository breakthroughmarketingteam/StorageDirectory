class Feature < ActiveRecord::Base
  
  belongs_to :unit_type
  belongs_to :ifeature, :class_name => 'IssnUnitTypeFeature', :foreign_key => 'StdUnitTypesFeaturesId', :primary_key => 'sID'
  
  def short_description
    self.ifeature.ShortDescription
  end
  
  def long_description
    self.ifeature.LongDescription
  end
  
end
