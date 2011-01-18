class RemoveFacilityFeaturesAndRePurposeModel < ActiveRecord::Migration
  def self.up
    FacilityFeature.delete_all
    remove_column :facility_features, :standard_id
    remove_column :facility_features, :listing_id
  end

  def self.down
  end
end
