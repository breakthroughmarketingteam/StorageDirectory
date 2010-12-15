class CreatePayments < ActiveRecord::Migration
  def self.up
    create_table :payments do |t|
      t.integer :amount
      t.string :transaction_type
      t.string :occurrence_type
      t.integer :occurrence_number
      t.integer :user_id

      t.timestamps
    end
    
    add_index :payments, :user_id
  end

  def self.down
    drop_table :payments
  end
end
