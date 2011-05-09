class CreateInvoices < ActiveRecord::Migration
  def self.up
    create_table :invoices do |t|
      t.integer :billing_info_id
      t.string :status
      t.string :term_code
      t.datetime :tran_date
      t.string :invoice_id
      t.string :tran_time
      t.string :tran_amount
      t.string :auth_code
      t.text :description
      t.text :order_number

      t.timestamps
    end
  end

  def self.down
    drop_table :invoices
  end
end
