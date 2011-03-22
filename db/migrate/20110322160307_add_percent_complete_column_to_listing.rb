class AddPercentCompleteColumnToListing < ActiveRecord::Migration
  def self.up
    add_column :listings, :profile_completion, :integer, :default => 0
  end

  def self.down
    remove_column :listings, :profile_completion
  end
end
