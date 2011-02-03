class ConvertTaxRateColumnToFloatInListing < ActiveRecord::Migration
  def self.up
    change_column :listings, :tax_rate, :float, :default => 0.0
  end

  def self.down
    change_column :listings, :tax_rate, :integer
  end
end
