class AddEmailTemplateColumnToEmailBlast < ActiveRecord::Migration
  def self.up
    add_column :email_blasts, :email_template, :string
  end

  def self.down
    remove_column :email_blasts, :email_template
  end
end
