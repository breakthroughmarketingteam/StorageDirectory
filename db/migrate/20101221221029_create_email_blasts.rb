class CreateEmailBlasts < ActiveRecord::Migration
  def self.up
    create_table :email_blasts do |t|
      t.string :title
      t.text :description
      t.text :content
      t.string :status
      t.datetime :blast_date

      t.timestamps
    end
  end

  def self.down
    drop_table :email_blasts
  end
end
