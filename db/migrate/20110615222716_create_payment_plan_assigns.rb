class CreatePaymentPlanAssigns < ActiveRecord::Migration
  def self.up
    create_table :payment_plan_assigns do |t|
      t.integer :client_id
      t.integer :payment_plan_id

      t.timestamps
    end
  end

  def self.down
    drop_table :payment_plan_assigns
  end
end
