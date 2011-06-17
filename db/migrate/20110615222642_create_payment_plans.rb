class CreatePaymentPlans < ActiveRecord::Migration
  def self.up
    create_table :payment_plans do |t|
      t.string :title
      t.float :price
      t.integer :recurs, :default => 0

      t.timestamps
    end
  end

  def self.down
    drop_table :payment_plans
  end
end
