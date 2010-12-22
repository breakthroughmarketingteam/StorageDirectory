class AddProcessErbColumnToEmailBlast < ActiveRecord::Migration
  def self.up
    add_column :email_blasts, :process_erb, :boolean
  end

  def self.down
    remove_column :email_blasts, :process_erb
  end
end
